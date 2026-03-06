'use client';

export default function SignInLink() {
  return (
    <a
      href="/login"
      className="link-signin"
      onClick={(e) => {
        e.preventDefault();
        window.location.assign('/login');
      }}
    >
      Sign in
    </a>
  );
}
