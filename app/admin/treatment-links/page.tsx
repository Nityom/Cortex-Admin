'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getAllTreatmentLinks,
  saveTreatmentLink,
  deleteTreatmentLink,
  toggleTreatmentLink,
  TreatmentLink,
  TreatmentInventoryItem,
} from '@/services/treatmentLinks';
import { getAllInventory, Inventory } from '@/services/inventory';
import {
  Link2,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Search,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  FlaskConical,
  Package,
  Sliders,
  Check,
  Info,
} from 'lucide-react';

const COMMON_DENTAL_PROCEDURES = [
  'Tooth Extraction',
  'Extraction',
  'Root Canal / RCT',
  'Teeth Cleaning',
  'Dental Filling',
  'Crown Cutting Done',
  'Cap Cutting Done',
  'Crown Fixed',
  'Dental Checkup',
  'Dental Bridge',
  'Dental Implant',
  'Teeth Whitening',
  'Braces Consultation',
];

export default function TreatmentLinksPage() {
  const [links, setLinks] = useState<TreatmentLink[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTreatmentName, setFormTreatmentName] = useState('');
  const [formItems, setFormItems] = useState<TreatmentInventoryItem[]>([]);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Simulator state
  const [simTreatment, setSimTreatment] = useState('');
  const [simQty, setSimQty] = useState<number>(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [linksData, invData] = await Promise.all([
        getAllTreatmentLinks(),
        getAllInventory(),
      ]);
      setLinks(linksData);
      setInventory(invData);
    } catch (err) {
      console.error('Failed to load treatment links data:', err);
      alert('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Open modal for new rule
  const handleAddNew = () => {
    setEditingId(null);
    setFormTreatmentName('');
    setFormItems([{ inventory_id: '', inventory_name: '', quantity: 1, unit: 'pcs' }]);
    setFormEnabled(true);
    setFormNotes('');
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (rule: TreatmentLink) => {
    setEditingId(rule._id || rule.id || null);
    setFormTreatmentName(rule.treatment_name);
    setFormItems(
      rule.items.map((i) => ({
        inventory_id: i.inventory_id || '',
        inventory_name: i.inventory_name,
        quantity: i.quantity || 1,
        unit: i.unit || 'pcs',
      }))
    );
    setFormEnabled(rule.enabled);
    setFormNotes(rule.notes || '');
    setShowModal(true);
  };

  // Add material item row in form
  const handleAddItemRow = () => {
    setFormItems((prev) => [
      ...prev,
      { inventory_id: '', inventory_name: '', quantity: 1, unit: 'pcs' },
    ]);
  };

  // Remove material item row in form
  const handleRemoveItemRow = (index: number) => {
    if (formItems.length === 1) {
      alert('A rule must have at least one inventory item.');
      return;
    }
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update item in row
  const handleUpdateItemRow = (index: number, updates: Partial<TreatmentInventoryItem>) => {
    setFormItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...updates };

        // If inventory_id or inventory_name changed from dropdown
        if (updates.inventory_name !== undefined) {
          const matchedInv = inventory.find(
            (inv) => inv.name.toLowerCase() === updates.inventory_name?.toLowerCase()
          );
          if (matchedInv) {
            next.inventory_id = matchedInv.id || (matchedInv as any)._id;
            next.unit = matchedInv.unit || next.unit || 'pcs';
          }
        }
        return next;
      })
    );
  };

  // Save Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTreatmentName.trim()) {
      alert('Please enter or select a treatment name.');
      return;
    }

    const validItems = formItems.filter((i) => i.inventory_name.trim());
    if (validItems.length === 0) {
      alert('Please specify at least one valid inventory item.');
      return;
    }

    try {
      setIsSaving(true);
      await saveTreatmentLink({
        id: editingId || undefined,
        treatment_name: formTreatmentName.trim(),
        items: validItems.map((item) => {
          const matchedInv = inventory.find(
            (inv) =>
              (item.inventory_id && (inv.id === item.inventory_id || (inv as any)._id === item.inventory_id)) ||
              inv.name.toLowerCase() === item.inventory_name.trim().toLowerCase()
          );
          return {
            inventory_id: matchedInv?.id || (matchedInv as any)?._id || item.inventory_id,
            inventory_name: matchedInv?.name || item.inventory_name.trim(),
            quantity: Math.max(1, Number(item.quantity) || 1),
            unit: item.unit || matchedInv?.unit || 'pcs',
          };
        }),
        enabled: formEnabled,
        notes: formNotes.trim() || undefined,
      });

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Failed to save treatment link rule:', err);
      alert(err.message || 'Failed to save treatment rule');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle enabled/disabled
  const handleToggle = async (rule: TreatmentLink) => {
    const id = rule._id || rule.id;
    if (!id) return;
    try {
      await toggleTreatmentLink(id, !rule.enabled);
      setLinks((prev) =>
        prev.map((l) => ((l._id || l.id) === id ? { ...l, enabled: !rule.enabled } : l))
      );
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Failed to update status.');
    }
  };

  // Delete rule
  const handleDelete = async (rule: TreatmentLink) => {
    const id = rule._id || rule.id;
    if (!id) return;
    if (!confirm(`Are you sure you want to delete the auto-link rule for "${rule.treatment_name}"?`)) {
      return;
    }

    try {
      await deleteTreatmentLink(id);
      setLinks((prev) => prev.filter((l) => (l._id || l.id) !== id));
    } catch (err) {
      console.error('Failed to delete rule:', err);
      alert('Failed to delete rule.');
    }
  };

  // Seed standard presets
  const handleSeedPresets = async () => {
    if (
      !confirm(
        'Load standard dental auto-link presets (e.g. Tooth Extraction -> Syringe, Lignox, Gauze; RCT -> Cotton, Syringe; Scaling -> Saliva Ejector)? Existing rules will be kept or updated.'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      // Find matching items in inventory or use placeholder names
      const findInvName = (keywords: string[], fallback: string) => {
        for (const kw of keywords) {
          const match = inventory.find((i) => i.name.toLowerCase().includes(kw.toLowerCase()));
          if (match) return match.name;
        }
        return fallback;
      };

      const syringeName = findInvName(['syringe', 'dispovan', 'needle'], 'Disposable Syringe 2ml');
      const lignoxName = findInvName(['lignox', 'lignocaine', 'anaesthetic', 'la'], 'Lignox 2% Cartridge');
      const cottonName = findInvName(['cotton', 'gauze'], 'Cotton Rolls');
      const salivaName = findInvName(['saliva', 'ejector', 'suction'], 'Saliva Ejector');
      const compositeName = findInvName(['composite', 'bonding', 'etchant'], 'Bonding Agent');

      const presetRules = [
        {
          treatment_name: 'Tooth Extraction',
          items: [
            { inventory_name: syringeName, quantity: 1, unit: 'pcs' },
            { inventory_name: lignoxName, quantity: 1, unit: 'pcs' },
            { inventory_name: cottonName, quantity: 2, unit: 'pcs' },
          ],
          enabled: true,
          notes: 'Auto-deduct syringe, local anaesthetic and cotton for extraction',
        },
        {
          treatment_name: 'Root Canal / RCT',
          items: [
            { inventory_name: syringeName, quantity: 1, unit: 'pcs' },
            { inventory_name: cottonName, quantity: 2, unit: 'pcs' },
          ],
          enabled: true,
          notes: 'Standard RCT irrigation syringe and cotton',
        },
        {
          treatment_name: 'Teeth Cleaning',
          items: [
            { inventory_name: salivaName, quantity: 1, unit: 'pcs' },
            { inventory_name: cottonName, quantity: 1, unit: 'pcs' },
          ],
          enabled: true,
          notes: 'Ultrasonic scaling suction & swabs',
        },
        {
          treatment_name: 'Dental Filling',
          items: [
            { inventory_name: compositeName, quantity: 1, unit: 'pcs' },
            { inventory_name: cottonName, quantity: 2, unit: 'pcs' },
          ],
          enabled: true,
          notes: 'Composite filling bonding & isolation',
        },
      ];

      for (const preset of presetRules) {
        await saveTreatmentLink(preset);
      }

      await loadData();
      alert('Standard presets created successfully! You can customize quantities and items anytime.');
    } catch (err: any) {
      console.error('Failed to seed presets:', err);
      alert('Error loading presets: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Filtered rules
  const filteredLinks = useMemo(() => {
    return links.filter((rule) => {
      const matchesSearch =
        rule.treatment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.items.some((i) => i.inventory_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? rule.enabled
          : !rule.enabled;

      return matchesSearch && matchesStatus;
    });
  }, [links, searchTerm, statusFilter]);

  // KPI Metrics
  const activeCount = links.filter((l) => l.enabled).length;
  const totalMaterialsMapped = links.reduce((sum, l) => sum + l.items.length, 0);
  const lowStockCount = links.reduce((count, l) => {
    const hasLow = l.items.some(
      (item) => item.current_stock !== undefined && item.current_stock < 10
    );
    return count + (hasLow ? 1 : 0);
  }, 0);

  // Simulation calculation
  const simulationResults = useMemo(() => {
    if (!simTreatment) return null;
    const match = links.find(
      (l) =>
        l.enabled &&
        (l.treatment_name.toLowerCase() === simTreatment.toLowerCase() ||
          simTreatment.toLowerCase().includes(l.treatment_name.toLowerCase()) ||
          l.treatment_name.toLowerCase().includes(simTreatment.toLowerCase()))
    );

    if (!match) return { matched: false, rule: null, items: [] };

    const items = match.items.map((item) => {
      const needed = item.quantity * Math.max(1, simQty);
      const current = item.current_stock ?? 0;
      const after = Math.max(0, current - needed);
      return {
        name: item.inventory_name,
        perProcedure: item.quantity,
        totalDeduct: needed,
        unit: item.unit || 'pcs',
        currentStock: current,
        afterStock: after,
        isLow: after < 10,
      };
    });

    return { matched: true, rule: match, items };
  }, [simTreatment, simQty, links]);

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/admin/inventory" className="hover:text-blue-600 transition flex items-center gap-1">
              <Layers size={14} /> Inventory Management
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Treatment Auto-Link</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
              <Link2 size={24} />
            </span>
            Treatment & Inventory Auto-Link
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Automatically deduct syringes, local anaesthetics, cotton, and other clinic consumables from inventory whenever specific treatments are completed in prescriptions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleSeedPresets}
            className="border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-blue-700 text-xs font-semibold rounded-xl h-10 shadow-sm transition"
          >
            <Sparkles size={15} className="mr-1.5 text-blue-600" />
            Load Common Dental Presets
          </Button>

          <Button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl h-10 px-4 shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
          >
            <Plus size={16} />
            Add Treatment Rule
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Rules
            </span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sliders size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{links.length}</span>
            <span className="text-xs text-slate-500">configured</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Active Auto-Deductions
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">{activeCount}</span>
            <span className="text-xs text-slate-500">of {links.length} enabled</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Materials Mapped
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Package size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{totalMaterialsMapped}</span>
            <span className="text-xs text-slate-500">linked items</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Low Stock Alerts
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600">{lowStockCount}</span>
            <span className="text-xs text-slate-500">rules affected</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by treatment (e.g. Extraction) or material name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-50/50 border-slate-200 rounded-xl text-sm h-10 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({links.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white text-rose-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive ({links.length - activeCount})
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="text-slate-500 hover:text-slate-900 rounded-xl h-9"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Rules List / Cards */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading treatment link rules...</p>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Link2 size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Auto-Link Rules Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {searchTerm
              ? `No rules matching "${searchTerm}". Try a different search.`
              : 'Create rules to automatically deduct materials whenever a treatment (e.g. Tooth Extraction, RCT) is recorded in prescriptions.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={handleSeedPresets}
              className="text-xs rounded-xl border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <Sparkles size={14} className="mr-1.5" />
              Load Common Dental Presets
            </Button>
            <Button
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl"
            >
              <Plus size={14} className="mr-1.5" />
              Add First Rule
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLinks.map((rule) => {
            const ruleId = rule._id || rule.id;
            return (
              <div
                key={ruleId}
                className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-sm hover:shadow-md ${
                  rule.enabled
                    ? 'border-slate-200/90'
                    : 'border-slate-200/50 bg-slate-50/60 opacity-75'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {rule.treatment_name}
                        </h3>
                        {rule.enabled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Paused
                          </span>
                        )}
                      </div>
                      {rule.notes && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{rule.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggle(rule)}
                        title={rule.enabled ? 'Click to Pause Rule' : 'Click to Enable Rule'}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition ${
                          rule.enabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => handleEdit(rule)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                        title="Edit Rule"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(rule)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Delete Rule"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Linked Inventory Items */}
                  <div className="mt-3 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Deducts when written in prescription:
                    </span>
                    <div className="space-y-1.5">
                      {rule.items.map((item, idx) => {
                        const stock = item.current_stock;
                        const isStockLow = stock !== undefined && stock < 10;
                        const isOutOfStock = stock === 0;

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-lg bg-blue-100/70 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                                {item.quantity}x
                              </span>
                              <span className="font-semibold text-slate-800 truncate">
                                {item.inventory_name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-slate-500 font-medium">
                                -{item.quantity} {item.unit || 'pcs'}
                              </span>

                              {stock !== undefined ? (
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1 ${
                                    isOutOfStock
                                      ? 'bg-rose-100 text-rose-700'
                                      : isStockLow
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                  title={`Current stock: ${stock} ${item.unit || 'pcs'}`}
                                >
                                  {isOutOfStock ? (
                                    'Out of stock'
                                  ) : isStockLow ? (
                                    <>
                                      <AlertTriangle size={11} /> Stock: {stock}
                                    </>
                                  ) : (
                                    <>
                                      <Check size={11} /> Stock: {stock}
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Unlinked Stock</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Triggers on exact or keyword match</span>
                  <span>{rule.items.length} material(s)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Test / Simulator Section */}
      <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <FlaskConical size={20} />
              </span>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Treatment Auto-Link Simulator
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Test any treatment text to see which materials would be deducted and the updated stock balance.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Treatment Name / Description
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g. Tooth Extraction, Extraction, Root Canal..."
                  value={simTreatment}
                  onChange={(e) => setSimTreatment(e.target.value)}
                  className="rounded-xl bg-white border-slate-200"
                />
                <select
                  onChange={(e) => setSimTreatment(e.target.value)}
                  value={simTreatment}
                  className="border border-slate-200 rounded-xl px-3 text-xs bg-white font-medium text-slate-700"
                >
                  <option value="">Quick Pick</option>
                  {links.map((l) => (
                    <option key={l._id || l.id} value={l.treatment_name}>
                      {l.treatment_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Procedure Qty
              </label>
              <Input
                type="number"
                min="1"
                value={simQty}
                onChange={(e) => setSimQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="rounded-xl bg-white border-slate-200"
              />
            </div>
          </div>

          {/* Simulator Output */}
          {simTreatment && (
            <div className="mt-4 p-4 rounded-2xl border bg-white">
              {simulationResults?.matched ? (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 mb-3">
                    <CheckCircle2 size={16} />
                    Matched Rule: &ldquo;{simulationResults.rule?.treatment_name}&rdquo;
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                          <th className="pb-2">Material</th>
                          <th className="pb-2">Deduct Qty</th>
                          <th className="pb-2">Current Stock</th>
                          <th className="pb-2">Remaining After</th>
                          <th className="pb-2">Stock Health</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {simulationResults.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                            <td className="py-2.5 font-bold text-rose-600">
                              -{item.totalDeduct} {item.unit}
                            </td>
                            <td className="py-2.5 text-slate-600">
                              {item.currentStock} {item.unit}
                            </td>
                            <td className="py-2.5 font-bold text-slate-900">
                              {item.afterStock} {item.unit}
                            </td>
                            <td className="py-2.5">
                              {item.isLow ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  <AlertTriangle size={11} /> Restock Recommended
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <Check size={11} /> Healthy Stock
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-700">
                  <Info size={16} />
                  No active auto-link rule matches &ldquo;{simTreatment}&rdquo;. No inventory would be deducted.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for Add / Edit Rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Link2 size={18} />
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Treatment Auto-Link Rule' : 'Add Treatment Auto-Link Rule'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              {/* Treatment Name Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Treatment / Procedure Name <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Tooth Extraction, Root Canal, Teeth Cleaning..."
                    value={formTreatmentName}
                    onChange={(e) => setFormTreatmentName(e.target.value)}
                    className="rounded-xl border-slate-200 text-sm font-medium"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-400">Quick suggestions:</span>
                    {COMMON_DENTAL_PROCEDURES.slice(0, 5).map((proc) => (
                      <button
                        key={proc}
                        type="button"
                        onClick={() => setFormTreatmentName(proc)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition"
                      >
                        {proc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Linked Inventory Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Materials to Deduct <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg transition"
                  >
                    <Plus size={13} /> Add Another Material
                  </button>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-500 text-[11px]">Item #{idx + 1}</span>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-slate-400 hover:text-rose-600 transition p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Select from Inventory */}
                        <div className="sm:col-span-7">
                          <select
                            value={item.inventory_name}
                            onChange={(e) =>
                              handleUpdateItemRow(idx, { inventory_name: e.target.value })
                            }
                            className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800"
                          >
                            <option value="">Select Inventory Material...</option>
                            {inventory.map((inv) => (
                              <option key={inv.id || (inv as any)._id} value={inv.name}>
                                {inv.name} (Stock: {inv.quantity} {inv.unit || 'pcs'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Deduct Quantity */}
                        <div className="sm:col-span-3">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItemRow(idx, {
                                  quantity: Math.max(1, parseInt(e.target.value) || 1),
                                })
                              }
                              className="h-9 rounded-xl text-center font-bold text-xs"
                              placeholder="Qty"
                            />
                            <span className="text-slate-400 text-[11px] shrink-0">qty</span>
                          </div>
                        </div>

                        {/* Unit */}
                        <div className="sm:col-span-2">
                          <Input
                            type="text"
                            value={item.unit || 'pcs'}
                            onChange={(e) => handleUpdateItemRow(idx, { unit: e.target.value })}
                            className="h-9 rounded-xl text-center text-xs"
                            placeholder="Unit"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Rule Status</span>
                  <span className="text-[11px] text-slate-500">
                    {formEnabled
                      ? 'Actively deducts stock when prescription is saved'
                      : 'Paused (will not deduct stock)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormEnabled(!formEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Description (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Standard 2ml syringe and 1 cartridge Lignox"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl text-xs h-10 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-10 px-5 font-semibold shadow-md shadow-blue-600/20"
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin mr-1.5" />
                  ) : (
                    <Save size={14} className="mr-1.5" />
                  )}
                  {editingId ? 'Update Rule' : 'Save Rule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
