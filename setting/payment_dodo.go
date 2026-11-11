package setting

// Dodo Payments uses a single "Pay What You Want" one-time product and passes
// the actual charge in the smallest currency unit when creating a checkout
// session, so the wallet keeps its arbitrary-amount top-up flow.
var (
	DodoApiKey     = ""
	DodoWebhookKey = ""
	DodoProductId  = ""
	DodoTestMode   = false
	DodoCurrency   = "USD"
	DodoUnitPrice  = 1.0
	DodoMinTopUp   = 1
)
