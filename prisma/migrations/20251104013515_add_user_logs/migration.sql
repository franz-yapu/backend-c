


-- Elimina la vista si existe
/* DROP VIEW IF EXISTS user_logs; */


-- Crea la vista con los nombres exactos de columnas
CREATE OR REPLACE VIEW user_logs AS
-- 1. Registro de usuarios
SELECT 
    id::text as id,
    id::text as user_id,
    'USER_REGISTER' as action,
    'AUTH' as module,
    NULL as ip_address,
    NULL as user_agent,
    json_build_object(
        'type', 'user_register',
        'email', email,
        'companyName', company_name,
        'source', 'view'
    ) as metadata,
    created_at
FROM "user"

UNION ALL

-- 2. Actualizaciones de perfil
SELECT 
    (gen_random_uuid())::text as id,
    id::text as user_id,
    'UPDATE_PROFILE' as action,
    'PROFILE' as module,
    NULL as ip_address,
    NULL as user_agent,
    json_build_object(
        'type', 'profile_update', 
        'source', 'view'
    ) as metadata,
    updated_at as created_at
FROM "user"
WHERE updated_at > created_at

UNION ALL

-- 3. Creación de lotes de café - CORREGIDO
SELECT 
    (gen_random_uuid())::text as id,
    "sellerId"::text as user_id,  -- ← Usar el nombre exacto con comillas
    'CREATE_COFFEE_LOT' as action,
    'COFFEE_LOT' as module,
    NULL as ip_address,
    NULL as user_agent,
    json_build_object(
        'type', 'coffee_lot_creation',
        'coffeeLotId', id,
        'coffeeLotName', name,
        'quantity', quantity,
        'source', 'view'
    ) as metadata,
    created_at
FROM coffee_lots

UNION ALL

-- 4. Creación de subastas - CORREGIDO
SELECT 
    (gen_random_uuid())::text as id,
    "adminId"::text as user_id,  -- ← Usar el nombre exacto con comillas
    'CREATE_AUCTION' as action,
    'AUCTION' as module,
    NULL as ip_address,
    NULL as user_agent,
    json_build_object(
        'type', 'auction_creation',
        'auctionId', id,
        'auctionTitle', title,
        'status', status,
        'source', 'view'
    ) as metadata,
    created_at
FROM auctions

UNION ALL

-- 5. Pujas (bids) - CORREGIDO
SELECT 
    (gen_random_uuid())::text as id,
    "userId"::text as user_id,  -- ← Usar el nombre exacto con comillas
    'CREATE_BID' as action,
    'AUCTION' as module,
    NULL as ip_address,
    NULL as user_agent,
    json_build_object(
        'type', 'bid_creation',
        'bidId', id,
        'auctionId', "auctionId",
        'coffeeLotId', "coffeeLotId",
        'amount', amount,
        'source', 'view'
    ) as metadata,
    created_at
FROM bids

UNION ALL

-- 6. Transacciones - Comprador - CORREGIDO
SELECT 
    (gen_random_uuid())::text as id,
    "buyerId"::text as user_id,  -- ← Usar el nombre exacto con comillas
    'CREATE_TRANSACTION' as action,
    'TRANSACTION' as module,
    NULL as ip_address,
    NULL as user_agent,
    json_build_object(
        'type', 'transaction',
        'transactionId', id,
        'role', 'BUYER',
        'amount', amount,
        'status', status,
        'source', 'view'
    ) as metadata,
    created_at
FROM transactions
WHERE "buyerId" IS NOT NULL

UNION ALL

-- 7. Transacciones - Vendedor - CORREGIDO
SELECT 
    (gen_random_uuid())::text as id,
    "sellerId"::text as user_id,  -- ← Usar el nombre exacto con comillas
    'CREATE_TRANSACTION' as action,
    'TRANSACTION' as module,
    NULL as ip_address,
    NULL as user_agent,
    json_build_object(
        'type', 'transaction',
        'transactionId', id,
        'role', 'SELLER',
        'amount', amount,
        'status', status,
        'source', 'view'
    ) as metadata,
    created_at
FROM transactions
WHERE "sellerId" IS NOT NULL;
