namespace az305_api.Dtos;

public class QuestionResponse
{
    required public string Id           { get; set; }
    public string Domain      { get; set; } = "";
    public string QuestionText { get; set; } = "";
    public string OptionA     { get; set; } = "";
    public string OptionB     { get; set; } = "";
    public string OptionC     { get; set; } = "";
    public string OptionD     { get; set; } = "";
    // answer・explanation はここにない
}
