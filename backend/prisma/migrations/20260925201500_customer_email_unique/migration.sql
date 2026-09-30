-- Unique email for client-space login. Multiple NULLs remain allowed.
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
