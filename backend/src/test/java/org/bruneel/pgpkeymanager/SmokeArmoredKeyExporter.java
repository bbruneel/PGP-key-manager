package org.bruneel.pgpkeymanager;

/** Writes a valid armored public key to stdout for smoke-test fixtures. */
public final class SmokeArmoredKeyExporter {

    private SmokeArmoredKeyExporter() {}

    public static void main(String[] args) {
        System.out.print(TestArmoredKeys.sampleEd25519PublicKey().armoredPublic());
    }
}
