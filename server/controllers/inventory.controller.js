const db = require('../database/db_client');

const getWarehouses = async (req, res) => {
    try {
        const warehouses = await db.warehouses.find();
        res.json(warehouses);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const restockWarehouse = async (req, res) => {
    try {
        const { warehouseId } = req.params;
        const { inventoryUpdates } = req.body; // { '250ml': 100, etc. }

        const warehouse = await db.warehouses.findById(warehouseId);
        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found.' });
        }

        const newInventory = { ...warehouse.inventory };
        for (const productId in inventoryUpdates) {
            newInventory[productId] = (newInventory[productId] || 0) + Number(inventoryUpdates[productId]);
        }

        // Validate capacity
        let totalStock = 0;
        for (const key in newInventory) {
            totalStock += newInventory[key];
        }
        if (totalStock > warehouse.capacity) {
            return res.status(400).json({ error: `Exceeds warehouse capacity limit of ${warehouse.capacity} units.` });
        }

        await db.warehouses.updateOne({ _id: warehouseId }, { $set: { inventory: newInventory } });

        await db.auditLogs.create({
            username: req.body.updatedBy || 'admin',
            role: 'warehouse_manager',
            action: 'INVENTORY_RESTOCK',
            details: `Restocked warehouse ${warehouse.name}. Stock counts updated.`,
            ipAddress: req.ip
        });

        res.json({ success: true, warehouse: { ...warehouse, inventory: newInventory } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getWarehouses,
    restockWarehouse
};
