namespace az305_api.Dtos;

public class CheckRequest
{
    public string SessionId  { get; set; } = "";
    public int?   TimeSeconds { get; set; }
    public string QuestionId { get; set; } = "";
    public string Selected   { get; set; } = ""; // "A"|"B"|"C"|"D"
}
