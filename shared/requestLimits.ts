// Multi-day structured generation can take longer than 30 seconds on Azure.
export const providerTimeoutMs = 120_000;
// Let the server return its safe timeout error before the browser gives up.
export const clientTimeoutMs = providerTimeoutMs + 10_000;
