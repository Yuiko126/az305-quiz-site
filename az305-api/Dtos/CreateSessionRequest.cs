namespace az305_api.Dtos;

public sealed class CreateSessionRequest
{
    public int?     Score          { get; set; }
    public int      TotalQuestions { get; set; }
    public int?     TimeSeconds    { get; set; }
    public string   Mode           { get; set; } = "exam";
    public DateTime StartedAt      { get; set; }
    public DateTime FinishedAt     { get; set; }
}
