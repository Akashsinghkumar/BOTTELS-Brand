import db from '../database/db_client.js';

export const getWarehouses = async (req, res) => {
    try {
        const env = req.env || (req.c ? req.c.env : null);
        const warehouses = await db.warehouses.find({}, env);
        const data = warehouses;
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const restockWarehouse = async (req, res) => {
    try {
        const env = req.env || (req.c ? req.c.env : null);
        const warehouseId = req.params?.warehouseId || (req.req ? req.req.param('warehouseId') : null);
        const body = req.body || (req.json ? await req.json() : {});
        const { inventoryUpdates, updatedBy } = body;

        const warehouse = await db.warehouses.findById(warehouseId, env);
        if (!warehouse) {
            const errObj = { error: 'Warehouse not found.' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }

        const newInventory = { ...warehouse.inventory };
        for (const productId in inventoryUpdates) {
            newInventory[productId] = (newInventory[productId] || 0) + Number(inventoryUpdates[productId]);
        }

        let totalStock = 0;
        for (const key in newInventory) {
            totalStock += newInventory[key];
        }
        if (totalStock > (warehouse.capacity || 5000)) {
            const errObj = { error: `Exceeds warehouse capacity limit of ${warehouse.capacity || 5000} units.` };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        await db.warehouses.updateOne({ id: warehouseId }, { inventory: newInventory }, env);

        await db.auditLogs.create({
            username: updatedBy || 'admin',
            role: 'warehouse_manager',
            action: 'INVENTORY_RESTOCK',
            details: `Restocked warehouse ${warehouse.name}.`
        }, env);

        const data = { success: true, warehouse: { ...warehouse, inventory: newInventory } };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export default {
    getWarehouses,
    restockWarehouse
};
