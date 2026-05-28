namespace az305_api.Dtos;

public class SessionResultDto
{
    public int Correct { get; set; }
    public int Total { get; set; }
    public int Rate { get; set; }

    public List<DomainResultDto> DomainResults { get; set; } = new();
    public List<AnswerResultDto> Answers { get; set; } = new();

    public int? AvgSeconds { get; set; }
    public int? PrevRate { get; set; }
}