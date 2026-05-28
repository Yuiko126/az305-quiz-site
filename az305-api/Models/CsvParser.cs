using az305_api.Models;

namespace az305_api.Models;

public static class CsvParser
{
    public static List<Question> Parse(string csvPath)
    {
        var questions = new List<Question>();
        var lines     = File.ReadAllLines(csvPath, System.Text.Encoding.UTF8);

        for (int i = 1; i < lines.Length; i++) // ヘッダーをスキップ
        {
            var line = lines[i].Trim();
            if (string.IsNullOrEmpty(line)) continue;

            var cols = ParseLine(line);
            if (cols.Count < 9) continue;

            questions.Add(new Question
            {
                Id            = cols[0].Trim(),
                Domain        = cols[1].Trim(),
                QuestionText  = cols[2].Trim(),
                OptionA       = cols[3].Trim(),
                OptionB       = cols[4].Trim(),
                OptionC       = cols[5].Trim(),
                OptionD       = cols[6].Trim(),
                Answer        = cols[7].Trim().ToUpper(),
                Explanation   = cols[8].Trim(),
                ReferenceUrl  = cols.Count > 9 && !string.IsNullOrEmpty(cols[9].Trim())
                                    ? cols[9].Trim()
                                    : null,
            });
        }

        return questions;
    }

    private static List<string> ParseLine(string line)
    {
        var result   = new List<string>();
        var current  = "";
        var inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current += '"';
                    i++;
                }
                else inQuotes = !inQuotes;
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(current);
                current = "";
            }
            else current += c;
        }

        result.Add(current);
        return result;
    }
}