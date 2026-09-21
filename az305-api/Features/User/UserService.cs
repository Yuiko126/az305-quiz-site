using az305_api.Services.Data;

namespace az305_api.Feature.User;

public sealed class UserService
{
    private readonly UserRepository _users;

    public UserService(UserRepository users)
    {
        _users = users;
    }

    public async Task<bool> UpdateProfileAsync(string userId, string username, string email)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return false;

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(email))
            return false;

        return await _users.UpdateProfileAsync(userId, username, email);
    }
}
