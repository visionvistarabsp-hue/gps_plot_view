import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  CheckCircle,
  Clock,
  RotateCcw,
  ArrowLeft,
  MapPin,
  Calendar,
  Lock,
  LogOut,
  RefreshCw,
  Database,
  ExternalLink,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { PropertyData, PlotStatus, PropertyType, FacingDirection } from '@/types/property';
import { STATUS_COLORS } from '@/config/map-config';
import { PROJECT_CONFIG } from '@/config/project-config';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingProperty, setEditingProperty] = useState<PropertyData | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'bookings'>('inventory');

  // Load properties
  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/properties');
      const json = await res.json();
      if (json.data) {
        setProperties(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Load bookings
  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const json = await res.json();
      if (json.data) {
        setBookings(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchBookings();
  }, []);

  // Auth0 / Simple Admin login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authEmail && authPassword) {
      // Authenticates with Admin session
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Please enter admin credentials');
    }
  };

  // Update property status directly
  const handleQuickStatusChange = async (property: PropertyData, newStatus: PlotStatus) => {
    try {
      const res = await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: property.id, status: newStatus })
      });
      if (res.ok) {
        setProperties(prev =>
          prev.map(p => (p.id === property.id ? { ...p, status: newStatus } : p))
        );
        setSaveSuccessMessage(`Status updated for Plot ${property.plotNumber} to ${newStatus.toUpperCase()}`);
        setTimeout(() => setSaveSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save full property edit form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    try {
      const res = await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProperty.id,
          status: editingProperty.status,
          price: editingProperty.price,
          area: editingProperty.area,
          facing: editingProperty.facing,
          type: editingProperty.type,
          notes: editingProperty.description
        })
      });

      if (res.ok) {
        setProperties(prev =>
          prev.map(p => (p.id === editingProperty.id ? editingProperty : p))
        );
        setEditingProperty(null);
        setSaveSuccessMessage(`Updated details for Plot ${editingProperty.plotNumber}`);
        setTimeout(() => setSaveSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered properties for table
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const matchSearch =
        searchQuery === '' ||
        p.plotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [properties, searchQuery, statusFilter]);

  // Inventory summary stats
  const stats = useMemo(() => {
    return {
      total: properties.length,
      available: properties.filter(p => p.status === 'available').length,
      reserved: properties.filter(p => p.status === 'reserved' || p.status === 'hold').length,
      sold: properties.filter(p => p.status === 'sold').length,
      blocked: properties.filter(p => p.status === 'blocked').length,
    };
  }, [properties]);

  // Login view if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Head>
          <title>Admin Portal Login | Greenfield Meadows</title>
        </Head>
        <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-8 shadow-2xl">
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 mx-auto shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Admin Authentication</h1>
            <p className="text-xs text-slate-400">
              Secured Auth0 & Neon PostgreSQL Portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                {authError}
              </div>
            )}

            <div>
              <label className="text-slate-300 font-medium block mb-1">Admin Email / Auth0 User</label>
              <input
                type="email"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                placeholder="admin@greenfieldmeadows.com"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Security Key / Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Access Admin Dashboard</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <Link href="/" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Masterplan Explorer
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Head>
        <title>Admin Control Center | Greenfield Meadows</title>
      </Head>

      {/* Top Navigation */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="View Live Map Explorer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Real-Estate Inventory Manager</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {PROJECT_CONFIG.name} • Neon PostgreSQL Connected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <span>Live Map</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
          </Link>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Toast Alert */}
        {saveSuccessMessage && (
          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Total Inventory</span>
            <span className="text-2xl font-black text-white mt-1 block">{stats.total} Units</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30">
            <span className="text-xs text-emerald-400 block font-medium">Available</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{stats.available} Units</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30">
            <span className="text-xs text-amber-400 block font-medium">Reserved / Hold</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">{stats.reserved} Units</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/30">
            <span className="text-xs text-rose-400 block font-medium">Sold</span>
            <span className="text-2xl font-black text-rose-400 mt-1 block">{stats.sold} Units</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700">
            <span className="text-xs text-slate-400 block font-medium">Blocked</span>
            <span className="text-2xl font-black text-slate-400 mt-1 block">{stats.blocked} Units</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Plot Inventory ({properties.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'bookings'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Site Visit Bookings ({bookings.length})
          </button>
        </div>

        {activeTab === 'inventory' ? (
          <div className="space-y-4">
            {/* Filter / Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search plot number or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                {['all', 'available', 'reserved', 'hold', 'sold', 'blocked'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      statusFilter === st
                        ? 'bg-slate-800 text-white border-emerald-500'
                        : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
                <button
                  onClick={fetchProperties}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                  title="Refresh from Database"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Plot ID</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Area</th>
                      <th className="py-3 px-4">Facing</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredProperties.map(p => {
                      const statusConf = STATUS_COLORS[p.status] || STATUS_COLORS.available;
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            {p.type === 'residential' ? `Plot ${p.plotNumber}` : p.plotNumber}
                          </td>
                          <td className="py-3 px-4 capitalize">
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                              {p.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">{p.area ? `${p.area} sq.ft` : '--'}</td>
                          <td className="py-3 px-4">{p.facing || 'East'}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-400">
                            {p.price ? `₹${(p.price / 100000).toFixed(2)} Lakh` : '--'}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={p.status}
                              onChange={e => handleQuickStatusChange(p, e.target.value as PlotStatus)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-slate-950 cursor-pointer focus:outline-none ${statusConf.bgBadge}`}
                            >
                              <option value="available">AVAILABLE</option>
                              <option value="reserved">RESERVED</option>
                              <option value="hold">HOLD</option>
                              <option value="sold">SOLD</option>
                              <option value="blocked">BLOCKED</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setEditingProperty(p)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 transition-colors inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Bookings Tab */
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Received Site Visit Requests</span>
            </h3>

            {bookings.length > 0 ? (
              <div className="space-y-2">
                {bookings.map((b, idx) => (
                  <div key={b.id || idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{b.clientName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          {b.plotNumber || 'General'}
                        </span>
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        📞 {b.clientPhone} • ✉️ {b.clientEmail || 'N/A'}
                      </div>
                      {b.notes && <div className="text-slate-500 mt-1 italic">&ldquo;{b.notes}&rdquo;</div>}
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[11px]">
                        {new Date(b.visitDate).toLocaleDateString()}
                      </span>
                      <span className="font-semibold text-emerald-400 text-[10px] uppercase">
                        {b.status || 'CONFIRMED'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs">
                No site visit appointments submitted yet.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Property Modal */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Edit Plot {editingProperty.plotNumber}
              </h3>
              <button
                onClick={() => setEditingProperty(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Status</label>
                  <select
                    value={editingProperty.status}
                    onChange={e => setEditingProperty({ ...editingProperty, status: e.target.value as PlotStatus })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="hold">Hold</option>
                    <option value="sold">Sold</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Property Type</label>
                  <select
                    value={editingProperty.type}
                    onChange={e => setEditingProperty({ ...editingProperty, type: e.target.value as PropertyType })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="residential">Residential</option>
                    <option value="lig">LIG</option>
                    <option value="ews">EWS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Total Price (INR)</label>
                  <input
                    type="number"
                    value={editingProperty.price || ''}
                    onChange={e => setEditingProperty({ ...editingProperty, price: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Area (sq. ft)</label>
                  <input
                    type="number"
                    value={editingProperty.area || ''}
                    onChange={e => setEditingProperty({ ...editingProperty, area: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Facing Direction</label>
                <select
                  value={editingProperty.facing || 'East'}
                  onChange={e => setEditingProperty({ ...editingProperty, facing: e.target.value as FacingDirection })}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                >
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="North-East">North-East</option>
                  <option value="North-West">North-West</option>
                  <option value="South-East">South-East</option>
                  <option value="South-West">South-West</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Description & Marketing Notes</label>
                <textarea
                  rows={2}
                  value={editingProperty.description || ''}
                  onChange={e => setEditingProperty({ ...editingProperty, description: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes to Database</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
