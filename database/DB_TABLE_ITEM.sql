CREATE TABLE items (
    item_id INT IDENTITY(1,1) PRIMARY KEY,
    owner_id VARCHAR(50) NOT NULL, -- อ้างอิงถึง user หรือ studentId/employeeId
    title NVARCHAR(255) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX),
    image_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'Available', -- Available, Reserved, Borrowed
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL
);