namespace az305_api.Dtos;

public class DomainStatDto
{
    public string Domain { get; set; } = "";
    public int Correct { get; set; }
    public int Total { get; set; }
    public int Rate => Total == 0 ? 0 : (int)Math.Round((double)Correct / Total * 100);
}