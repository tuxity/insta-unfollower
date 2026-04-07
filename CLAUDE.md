- Follow DRY, SOLID, OOP and Robert C. Martin's Clean Code principles:
  - Avoid comments as much as possible: use clean code that self-explains instead.
  - Helper methods must be organized immediately after the methods that use them, in the order they are called.
  - Empty lines:
      - Use between: methods, functions, classes, imports, and logical sections of files.
      - Don't use inside: method/function bodies (if needed, extract helper methods to respect SRP).
      - Exception: tests MUST follow AAA pattern with empty lines separating Arrange, Act, Assert sections.
  - Imports always at the top of the file.
- Never create new md files to explain things you could explain on chat.
- Keep responses concise, don't waste tokens unnecessarily, unless explicitly requested to.
- Ask what's actually needed before adding complexity.
- Prioritize simpler solutions.
- Don't run tests, I do it.
- Take as much advantage of line width when using dicts and lists. Example:
    """
    const {container} = renderWithProviders(
    <AdBanner />
    )
    """
    can be written in one line as "const {container} = renderWithProviders(<AdBanner />)"
- Use four spaces for indentation.
- Don't nest classes, functions or methods.
