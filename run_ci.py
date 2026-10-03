import sys
import subprocess
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def run_command(cmd, cwd=None, title=""):
    print(f"\n=======================================================")
    print(f"RUNNING: {title or cmd}")
    print(f"CWD: {cwd or os.getcwd()}")
    print(f"=======================================================")
    res = subprocess.run(cmd, cwd=cwd, shell=True)
    if res.returncode != 0:
        print(f"\n❌ FAILED: {title or cmd} (exit code: {res.returncode})")
        return False
    print(f"✅ PASSED: {title or cmd}")
    return True

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    daniya_dir = os.path.join(root_dir, "daniya")
    backend_dir = os.path.join(root_dir, "backend")

    results = {}

    # 1. Frontend Tests
    results["frontend_test"] = run_command("npm test", cwd=daniya_dir, title="Frontend Unit & Contract Tests")
    if not results["frontend_test"]:
        sys.exit(1)

    # 2. Frontend Build
    results["frontend_build"] = run_command("npm run build", cwd=daniya_dir, title="Frontend Production Bundle Build")
    if not results["frontend_build"]:
        sys.exit(1)

    # 3. Backend Pytest
    pytest_bin = os.path.join(backend_dir, ".venv", "Scripts", "pytest.exe")
    if not os.path.exists(pytest_bin):
        pytest_bin = "pytest"

    results["backend_pytest"] = run_command(f'"{pytest_bin}" -c pytest.ini tests', cwd=backend_dir, title="Backend Pytest Suite (All 29 tests)")
    if not results["backend_pytest"]:
        sys.exit(1)

    print("\n" + "=" * 60)
    print("🏆 ALL ACCEPTANCE GATES PASSED CLEANLY! CI IS GREEN!")
    print("=" * 60)

if __name__ == "__main__":
    main()
