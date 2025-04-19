function parse_nested_json(tag, timestamp, record)
    -- Function to parse a JSON string without using external libraries
    local function try_parse_json(str)
        if type(str) ~= "string" then return str end
        
        -- Remove whitespace
        str = str:match("^%s*(.-)%s*$")
        
        -- Check if it looks like a JSON object or array
        if str:sub(1,1) ~= "{" and str:sub(1,1) ~= "[" then
            return str
        end

        -- Try to evaluate as Lua table
        str = str:gsub('"([^"]-)":', "[%1]=")  -- Convert "key": to ["key"]=
        str = str:gsub(':"([^"]-)"', "=[[\1]]") -- Convert :"value" to =[=[value]=]
        str = str:gsub('":"', "=[=[") -- Handle remaining string values
        str = str:gsub('","', "]=],=[") -- Handle string array values
        str = str:gsub('"}', "]=]}") -- Close string values
        str = str:gsub('"', "") -- Remove remaining quotes
        str = str:gsub("{", "{[=[") -- Handle opening braces
        str = str:gsub("}", "]=]}") -- Handle closing braces
        str = str:gsub("%[", "{") -- Convert arrays to tables
        str = str:gsub("%]", "}") -- Convert arrays to tables
        
        local fn, err = load("return " .. str)
        if fn then
            local success, result = pcall(fn)
            if success then
                return result
            end
        end
        return str
    end

    -- Function to recursively parse values that might be JSON strings
    local function parse_value(value)
        if type(value) == "string" then
            return try_parse_json(value)
        elseif type(value) == "table" then
            local result = {}
            for k, v in pairs(value) do
                result[k] = parse_value(v)
            end
            return result
        end
        return value
    end

    -- Parse nested fields in the record
    for key, value in pairs(record) do
        record[key] = parse_value(value)
    end

    return 1, timestamp, record
end