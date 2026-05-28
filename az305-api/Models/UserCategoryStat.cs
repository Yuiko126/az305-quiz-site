namespace az305_api.Models;

public class UserCategoryStat
{
    public string CategoryId { get; set; } = "";
    public string CategoryName { get; set; } = "";
    public int TotalAttempts { get; set; }
    public int TotalCorrect { get; set; }
    public double AccuracyPct { get; set; }
}