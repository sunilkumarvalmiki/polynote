/**
 * AI Provider Types
 * Defines interfaces for AI provider abstraction layer
 */
/**
 * Supported AI provider types
 */
export var ProviderType;
(function (ProviderType) {
    ProviderType["OLLAMA"] = "ollama";
    ProviderType["GPT4ALL"] = "gpt4all";
    ProviderType["LLAMA_CPP"] = "llama_cpp";
    ProviderType["OPENAI"] = "openai";
    ProviderType["CLAUDE"] = "claude";
})(ProviderType || (ProviderType = {}));
/**
 * Provider execution location
 */
export var ProviderLocation;
(function (ProviderLocation) {
    ProviderLocation["LOCAL"] = "local";
    ProviderLocation["CLOUD"] = "cloud";
})(ProviderLocation || (ProviderLocation = {}));
/**
 * AI operation types
 */
export var OperationType;
(function (OperationType) {
    OperationType["SUMMARIZE"] = "summarize";
    OperationType["TRANSLATE"] = "translate";
    OperationType["REWRITE"] = "rewrite";
    OperationType["CHAT"] = "chat";
})(OperationType || (OperationType = {}));
/**
 * Translation language codes
 */
export var Language;
(function (Language) {
    Language["ENGLISH"] = "en";
    Language["TELUGU"] = "te";
    Language["HINDI"] = "hi";
})(Language || (Language = {}));
/**
 * Rewrite style options
 */
export var RewriteStyle;
(function (RewriteStyle) {
    RewriteStyle["FORMAL"] = "formal";
    RewriteStyle["CASUAL"] = "casual";
    RewriteStyle["CONCISE"] = "concise";
    RewriteStyle["DETAILED"] = "detailed";
    RewriteStyle["TECHNICAL"] = "technical";
    RewriteStyle["SIMPLE"] = "simple";
})(RewriteStyle || (RewriteStyle = {}));
