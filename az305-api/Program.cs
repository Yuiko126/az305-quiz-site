var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

builder.Services.AddSingleton<DbService>();
builder.Services.AddScoped<QuestionRepository>();
builder.Services.AddScoped<SessionRepository>();
builder.Services.AddScoped<RefreshTokenRepository>();
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<PasswordCredentialService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddSingleton<CorsHelper>();
builder.Services.AddScoped<CheckAnswerService>();

builder.Build().Run();
