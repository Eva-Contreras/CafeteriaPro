-- ==============================================================
-- SCRIPT DE CREACIÓN DE TABLAS PARA PERSONALIZACIÓN DE PRODUCTOS
-- COFFEETRACK - BD: cafeteriadb | SCHEMA: cafeteriadb
-- ==============================================================

USE cafeteriadb;
GO

-- 1. Crear tabla TiposLeche en el esquema cafeteriadb
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('cafeteriadb.TiposLeche'))
BEGIN
    CREATE TABLE cafeteriadb.TiposLeche (
        IdLeche INT PRIMARY KEY IDENTITY(1,1),
        Nombre VARCHAR(50) NOT NULL,
        IdInventario INT NOT NULL,
        CantidadBase DECIMAL(10,3) NOT NULL,
        FOREIGN KEY (IdInventario) REFERENCES [cafeteriadb].[inventario](IdInventario)
    );
    PRINT '✅ Tabla cafeteriadb.TiposLeche creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'ℹ️ La tabla cafeteriadb.TiposLeche ya existe.';
END;
GO

-- 2. Crear tabla ShotsCafe en el esquema cafeteriadb
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('cafeteriadb.ShotsCafe'))
BEGIN
    CREATE TABLE cafeteriadb.ShotsCafe (
        IdShot INT PRIMARY KEY IDENTITY(1,1),
        CantidadShots INT NOT NULL UNIQUE,
        ExtraCafe DECIMAL(10,3) NOT NULL
    );
    PRINT '✅ Tabla cafeteriadb.ShotsCafe creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'ℹ️ La tabla cafeteriadb.ShotsCafe ya existe.';
END;
GO

-- 3. Inserción de configuración de Shots de café (1, 2, 3)
IF NOT EXISTS (SELECT 1 FROM cafeteriadb.ShotsCafe)
BEGIN
    INSERT INTO cafeteriadb.ShotsCafe (CantidadShots, ExtraCafe) VALUES 
    (1, 0.000), -- 1 shot: Receta base
    (2, 0.007), -- 2 shots: 7 gramos extra (0.007 kg)
    (3, 0.014); -- 3 shots: 14 gramos extra (0.014 kg)
    PRINT '✅ Insertados datos de configuración para ShotsCafe.';
END
ELSE
BEGIN
    PRINT 'ℹ️ Los datos de ShotsCafe ya estaban insertados.';
END;
GO

-- 4. Inserción de configuración de Leches (mapeados a los insumos en cafeteriadb.inventario)
-- Mapeo basado en la base de datos real:
-- IdInventario 4 -> Leche entera
-- IdInventario 5 -> Leche deslactosada
-- IdInventario 6 -> Leche de almendras
IF NOT EXISTS (SELECT 1 FROM cafeteriadb.TiposLeche)
BEGIN
    INSERT INTO cafeteriadb.TiposLeche (Nombre, IdInventario, CantidadBase) VALUES
    ('Entera', 4, 0.250),       -- 250ml
    ('Deslactosada', 5, 0.250), -- 250ml
    ('Almendra', 6, 0.250);     -- 250ml
    PRINT '✅ Insertados datos de configuración de ejemplo para TiposLeche.';
END
ELSE
BEGIN
    PRINT 'ℹ️ Los datos de TiposLeche ya estaban insertados.';
END;
GO
