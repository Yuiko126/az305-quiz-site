using az305_api.Models;
using Microsoft.AspNetCore.Identity;

namespace az305_api.Services.Auth;

public sealed class PasswordCredentialService
{
    private readonly PasswordHasher<User> _hasher = new();

    public string HashPassword(string password)
    {
        return _hasher.HashPassword(new User(), password);
    }

    public bool VerifyPassword(User? user, string password)
    {
        if (user is null || user.IsActive == 0)
            return false;

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return result != PasswordVerificationResult.Failed;
    }
}
