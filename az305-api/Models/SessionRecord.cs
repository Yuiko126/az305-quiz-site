namespace az305_api.Models;

public class SessionRecord
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Mode { get; set; } = "";
    public DateTime StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public int? TimeSeconds { get; set; }
    public int Total { get; set; }
    public int Correct { get; set; }
    public string Domain { get; set; } = "";

    // 便利なプロパティ
    public int Rate => Total > 0 ? (int)Math.Round((double)Correct / Total * 100) : 0;
    public string Date => StartedAt.ToString("yyyy-MM-dd");
}