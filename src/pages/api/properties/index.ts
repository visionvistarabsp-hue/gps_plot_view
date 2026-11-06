import type { NextApiRequest, NextApiResponse } from 'next';
import { getRuntimeProperties, updateRuntimeProperty } from '@/lib/property-store';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // If Neon PostgreSQL database is configured, read from DB, otherwise use runtime store
      if (process.env.DATABASE_URL) {
        try {
          const dbProps = await prisma.property.findMany({
            orderBy: { propertyNumber: 'asc' }
          });
          if (dbProps && dbProps.length > 0) {
            return res.status(200).json({
              success: true,
              source: 'neon_postgres',
              data: dbProps
            });
          }
        } catch (dbErr) {
          console.warn('Neon DB query failed, falling back to runtime store:', dbErr);
        }
      }

      const properties = getRuntimeProperties();
      return res.status(200).json({
        success: true,
        source: 'runtime_cache',
        data: properties
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, status, price, area, facing, type, notes } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Property ID or plotNumber is required' });
      }

      const updated = updateRuntimeProperty(id, {
        ...(status && { status }),
        ...(price !== undefined && { price: Number(price) }),
        ...(area !== undefined && { area: Number(area) }),
        ...(facing && { facing }),
        ...(type && { type }),
        ...(notes && { description: notes })
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }

      // If Neon DB is available, sync to DB as well
      if (process.env.DATABASE_URL) {
        try {
          await prisma.property.updateMany({
            where: {
              OR: [{ id }, { propertyNumber: id }, { geojsonId: id }]
            },
            data: {
              ...(status && { status }),
              ...(price !== undefined && { price: Number(price) }),
              ...(area !== undefined && { areaSqFt: Number(area) }),
              ...(facing && { facing }),
              ...(notes && { notes })
            }
          });
        } catch (e) {
          console.warn('Sync to Neon DB error:', e);
        }
      }

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
