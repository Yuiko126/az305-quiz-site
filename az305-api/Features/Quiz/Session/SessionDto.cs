namespace az305_api.Models;

public class SessionDto
{
    public string UserId { get; set; } = "";
    public int Correct { get; set; }
    public int Total { get; set; }
    public string Domain { get; set; } = "";
    public string Mode { get; set; } = "";
}
