import sys

if "--restore-cosmic-look" in sys.argv:
    # Used by ./install.sh --uninstall: put COSMIC's own look back the way it was.
    from .cosmic_look import restore

    print("COSMIC look restored." if restore() else "Nothing to restore.")
    sys.exit(0)

from .shell import main  # noqa: E402

sys.exit(main())
