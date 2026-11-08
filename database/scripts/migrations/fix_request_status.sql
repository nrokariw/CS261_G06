-- ลบ CHECK constraint เก่าของสถานะคำขอยืม เพื่อให้บันทึกสถานะ CHANGE_REQUESTED ได้
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_NAME(cc.parent_object_id)) + N' DROP CONSTRAINT ' + QUOTENAME(cc.name) + N'; '
FROM sys.check_constraints cc
JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
WHERE cc.parent_object_id IN (OBJECT_ID('borrow_requests'), OBJECT_ID('borrow_request'))
  AND c.name IN ('request_status', 'status');

IF @sql <> N''
BEGIN
    EXEC sp_executesql @sql;
END
GO

-- เพิ่มคอลัมน์ response_reason ในตาราง borrow_requests เพื่อรองรับเหตุผลการขอแก้ไขเงื่อนไข
IF OBJECT_ID('borrow_requests', 'U') IS NOT NULL AND COL_LENGTH('borrow_requests', 'response_reason') IS NULL
BEGIN
    ALTER TABLE borrow_requests ADD response_reason NVARCHAR(MAX) NULL;
END
GO
