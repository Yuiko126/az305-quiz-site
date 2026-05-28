import { useState } from "react";

type Props = {
  onLoginSuccess: () => Promise<void>;
};

export function LoginPage({ onLoginSuccess }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canLogin = email.trim() !== "" && password.trim() !== "";

  // ✅ 登録ボタンの有効/無効
  const canRegister = 
    username.trim().length >= 5 &&  // ← 8 → 5 に変更
    email.trim() !== "" && 
    password.length >= 8 && 
    password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (mode === "login") {
        const res = await fetch("http://localhost:7071/api/Login", {
          method: "POST",
          credentials: "include", // ✅ Cookie 必須
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loginId: email,
            password,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "ログインに失敗しました");
        }

        // Cookieの設定を確実にするため、少し待つ
        await new Promise(resolve => setTimeout(resolve, 100));

        // ✅ Cookie がセットされたあとに /api/Me を再確認させる
        await onLoginSuccess();
      } else {
        if (password !== confirmPassword) {
          setError("パスワードが一致しません");
          return;
        }

        console.log("=== 登録リクエスト送信 ===");
        console.log("username:", username);
        console.log("email:", email);
        console.log("password:", password);

        const res = await fetch("http://localhost:7071/api/auth/register", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            email,
            password,
          }),
        });

        console.log("=== レスポンス ===");
        console.log("Status:", res.status);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.log("Error Data:", errorData);

          if (res.status === 409) {
            throw new Error("このメールアドレスまたはユーザー名は既に登録されています");
          }

          throw new Error(errorData.error || "登録に失敗しました");
        }

        const successData = await res.json();
        console.log("=== 登録成功 ===", successData);

        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setUserName("");  // ← 修正：setUsername → setUserName
        alert("✅ 登録が完了しました！ログインしてください。");
      }
    } catch (err) {
      console.error("=== エラー詳細 ===", err);
      setError(
        err instanceof Error 
          ? err.message 
          : mode === "login"
          ? "ログインに失敗しました"
          : "登録に失敗しました"
      );
    }
  }

  return (
    <div style={rootStyle}>
      <div style={rightStyle}>
        <div style={formWrapperStyle}>
          <h2 style={titleStyle}>
            {mode === "login" ? "ログイン" : "新規登録"}
          </h2>

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <Field label="ユーザーネーム">
                <input
                  value={username}
                  placeholder="5文字以上にしてください"
                  onChange={(e) => setUserName(e.target.value)}
                  style={inputStyle}
                />
                              {username.length > 0 && username.length < 5 && (
                                  <div style={{ color: "#C00", fontSize: 12, marginTop: 4,textAlign:'left' }}>
                    ユーザー名は5文字以上必要です（現在：{username.length}文字）
                  </div>
                )}
              </Field>
            )}

            <Field label="メールアドレス">
              <input
                type="email"
                autoComplete="email"
                value={email}
                placeholder="メールアドレスを入力してください"
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="パスワード">
              <input
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                placeholder="8文字以上の半角英数字"
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
              {mode === "register" && password.length > 0 && password.length < 8 && (
                <div style={{ color: "#C00", fontSize: 12, marginTop: 4 }}>
                  パスワードは8文字以上必要です（現在：{password.length}文字）
                </div>
              )}
            </Field>

            {mode === "register" && (
              <Field label="パスワード（確認）">
                <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                placeholder="確認のためもう一度入力してください"
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
                />
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <div style={{ color: "#C00", fontSize: 12, marginTop: 4 }}>
                    パスワードが一致しません
                  </div>
                )}
              </Field>
            )}

            {error && <div style={errorStyle}>{error}</div>}

            <button
  type="submit"
  disabled={mode === "login" ? !canLogin : !canRegister}
  style={{
    ...buttonStyle,
    background: (mode === "login" ? canLogin : canRegister) ? "#1A1A1A" : "#CCC",
    cursor: (mode === "login" ? canLogin : canRegister) ? "pointer" : "not-allowed",
  }}
>
 {mode === "login" ? "ログイン" : "登録"}
            </button>
          </form>

          <div style={switchStyle}>
            {mode === "login" ? (
              <button onClick={() => setMode("register")} style={linkStyle}>
                新規登録はこちら
              </button>
            ) : (
              <button onClick={() => setMode("login")} style={linkStyle}>
                ログインに戻る
              </button>
            )}
          </div>
          
        </div>

      </div>
    </div>
  );
}

/* -------------------------
   共通 Field コンポーネント
------------------------- */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

/* -------------------------
   Styles
------------------------- */

const rootStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  fontFamily: "'Noto Sans JP', sans-serif",
};

const rightStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "64px 32px",
  background: "#fff"};

const formWrapperStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 480,
  padding: "66px 30px",
  borderRadius: "12px",
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 500,
  marginBottom: 40,
  fontFamily: "'Noto Sans JP'",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#555",
  display: "block",
  textAlign:'left',
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  borderBottom: "1px solid #CCC",
  fontSize: 14,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  height: 60,
  background: "#1A1a1A",
  color: "#fafaf8",
  fontWeight: 500,
  marginTop: 24,
  padding: "18px 0 20px 0",
  letterSpacing: "-1px"
};

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#000",
  fontSize: 14,
  cursor: "pointer",
};

const switchStyle: React.CSSProperties = {
  textAlign: "center",
  marginTop: 32,
};

const errorStyle: React.CSSProperties = {
  color: "#C00",
  fontSize: 13,
  marginTop: 8,
};