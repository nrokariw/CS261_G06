USE [$(DB_NAME)];
GO

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
