using System.Text.Json.Serialization;

namespace az305_api.Models;

// ─── CSV から読み込む完全な問題（answer含む）───
// サーバー内部でのみ使用。クライアントには返さない。
public class Question
{
    required public string    Id           { get; set; }
    public string Domain      { get; set; } = "";
    public string QuestionText { get; set; } = "";
    public string OptionA     { get; set; } = "";
    public string OptionB     { get; set; } = "";
    public string OptionC     { get; set; } = "";
    public string OptionD     { get; set; } = "";
    public string Answer      { get; set; } = ""; // ← サーバー内部のみ
    public string Explanation { get; set; } = "";
    public string? ReferenceUrl { get; set; }
}
