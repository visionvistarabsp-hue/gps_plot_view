import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

// In-memory bookings store for seamless local operation
const mockBookings: any[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (process.env.DATABASE_URL) {
      try {
        const bookings = await prisma.siteVisitBooking.findMany({
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ success: true, data: bookings });
      } catch (e) {
        console.warn('DB fetch bookings error:', e);
      }
    }
    return res.status(200).json({ success: true, data: mockBookings });
  }

  if (req.method === 'POST') {
    try {
      const { plotNumber, clientName, clientEmail, clientPhone, visitDate, notes } = req.body;

      if (!clientName || !clientPhone || !visitDate) {
        return res.status(400).json({ success: false, error: 'Name, Phone and Visit Date are required' });
      }

      const booking = {
        id: `book-${Date.now()}`,
        plotNumber: plotNumber || 'General Visit',
        clientName,
        clientEmail: clientEmail || '',
        clientPhone,
        visitDate: new Date(visitDate),
        notes: notes || '',
        status: 'CONFIRMED',
        createdAt: new Date().toISOString()
      };

      mockBookings.unshift(booking);

      if (process.env.DATABASE_URL) {
        try {
          await prisma.siteVisitBooking.create({
            data: {
              plotNumber: booking.plotNumber,
              clientName: booking.clientName,
              clientEmail: booking.clientEmail,
              clientPhone: booking.clientPhone,
              visitDate: new Date(visitDate),
              notes: booking.notes,
              status: 'CONFIRMED'
            }
          });
        } catch (e) {
          console.warn('Prisma create booking error:', e);
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Site visit booked successfully! Our sales manager will contact you shortly.',
        data: booking
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
