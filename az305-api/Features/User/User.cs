namespace az305_api.Models;

public sealed class User
{
    public string Id { get; init; } = "";
    public string Username { get; init; } = "";
    public string Email { get; init; } = "";
    public string PasswordHash { get; init; } = "";
    public int IsActive { get; init; }
}