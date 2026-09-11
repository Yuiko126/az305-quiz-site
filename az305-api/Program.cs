using Microsoft.Azure.Functions.Worker.Builder;
using az305_api.Functions;
using az305_api.Services;
using az305_api.Services.Auth;
using az305_api.Services.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

builder.Services.AddSingleton<DbService>();
builder.Services.AddScoped<QuestionRepository>();
builder.Services.AddScoped<SessionRepository>();
builder.Services.AddScoped<RefreshTokenRepository>();
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddSingleton<CorsHelper>();

builder.Build().Run();
