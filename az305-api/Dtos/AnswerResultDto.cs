namespace az305_api.Dtos;

public class AnswerResultDto
{
    public string QuestionText { get; set; } = "";
    public string Selected { get; set; } = "";
    public string CorrectAnswer { get; set; } = "";
    public bool IsCorrect { get; set; }
}