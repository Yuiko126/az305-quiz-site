using System.ComponentModel.DataAnnotations;

namespace az305_api.Dtos.Auth;

public sealed class LoginRequest
{
    [Required(ErrorMessage = "ユーザー名またはメールアドレスは必須です")]
    [MinLength(8, ErrorMessage = "この項目は8文字以上である必要があります")]
    public string LoginId { get; init; } = ""; // email or username

    [Required(ErrorMessage = "パスワードは必須です")]
    [MinLength(8, ErrorMessage = "パスワードは8文字以上である必要があります")]
    public string Password { get; init; } = "";
}