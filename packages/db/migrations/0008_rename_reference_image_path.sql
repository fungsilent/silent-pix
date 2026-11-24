UPDATE `workflows`
SET `config_schema` = json_remove(
    CASE
        WHEN json_type(`config_schema`, '$.referenceImagePath') IS NULL
        THEN json_set(`config_schema`, '$.referenceImagePath', json_extract(`config_schema`, '$.initImagePath'))
        ELSE `config_schema`
    END,
    '$.initImagePath'
)
WHERE json_type(`config_schema`, '$.initImagePath') IS NOT NULL;
