# Contributing to Kabalikat Agent

First off, thanks for taking the time to contribute!

The following is a set of guidelines for contributing to Kabalikat Agent. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

-   **Use a clear and descriptive title** for the issue to identify the problem.
-   **Describe the exact steps which reproduce the problem** in as much detail as possible.
-   **Provide specific examples to demonstrate the steps**. Include links to files or line numbers, or copy/pasteable snippets, which you use in those examples.
-   **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
-   **Explain which behavior you expected to see instead and why.**

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

-   **Use a clear and descriptive title** for the issue to identify the suggestion.
-   **Provide a step-by-step description of the suggested enhancement** in as much detail as possible.
-   **Explain why this enhancement would be useful** to most Kabalikat users.

### Pull Requests

1.  Fork the repo and create your branch from `main`.
2.  Run `npm install` to install dependencies.
3.  If you have an Android device attached, you can run `npx cap open android` to open Android Studio.
4.  Make sure your code lints and builds:
    ```bash
    npm run build
    npm run lint # (If lint script is configured)
    ```
5.  If you've added code that should be tested, add tests.
6.  Ensure the test suite passes.
7.  Issue that pull request!

## Styleguides

### Git Commit Messages

*   Use the present tense ("Add feature" not "Added feature")
*   Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
*   Limit the first line to 72 characters or less
*   Reference issues and pull requests liberally after the first line
