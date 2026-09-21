using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace az305_api.Dtos.Auth;

public sealed class RegisterRequest
{
    [JsonPropertyName("username")]
    [Required(ErrorMessage = "ユーザー名は必須です")]
    [MinLength(5, ErrorMessage = "ユーザー名は5文字以上である必要があります")]
    [MaxLength(50, ErrorMessage = "ユーザー名は50文字以下である必要があります")]
    public string Username { get; init; } = "";

    [JsonPropertyName("email")]
    [Required(ErrorMessage = "メールアドレスは必須です")]
    [EmailAddress(ErrorMessage = "有効なメールアドレス形式で入力してください")]
    public string Email { get; init; } = "";

    [JsonPropertyName("password")]
    [Required(ErrorMessage = "パスワードは必須です")]
    [MinLength(8, ErrorMessage = "パスワードは8文字以上である必要があります")]
    public string Password { get; init; } = "";
}