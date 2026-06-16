CREATE TABLE groups (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_user_id UUID NOT NULL REFERENCES app_users (id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX groups_name_unique_idx ON groups (LOWER(name));
CREATE INDEX groups_owner_user_id_idx ON groups (owner_user_id);

CREATE TABLE group_members (
    group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    invited_by_user_id UUID REFERENCES app_users (id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX group_members_user_id_idx ON group_members (user_id);

CREATE TABLE group_invites (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    email TEXT,
    invitee_user_id UUID REFERENCES app_users (id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    invited_by_user_id UUID NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_invites_target_check CHECK (email IS NOT NULL OR invitee_user_id IS NOT NULL)
);

CREATE INDEX group_invites_group_id_idx ON group_invites (group_id);
CREATE INDEX group_invites_active_token_idx ON group_invites (token) WHERE accepted_at IS NULL;
CREATE INDEX group_invites_invitee_user_id_idx ON group_invites (invitee_user_id)
    WHERE invitee_user_id IS NOT NULL;
