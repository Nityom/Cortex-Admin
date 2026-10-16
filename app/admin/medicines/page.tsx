"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { addMedicine, getAllMedicines, deleteMedicine, updateMedicine, Medicine } from '@/services/medicine';
import { PlusCircle, X, Trash2, Search, ArrowUp, ArrowDown, Package, Pill, RefreshCw, Edit, ReceiptText, UserCheck } from 'lucide-react';
import { useIsAdmin } from '@/hooks/use-is-admin';

export default function AddMedicinePage() {
  const [formData, setFormData] = useState<Medicine>({
    name: '',
    composition: '',
    company: '',
    description: '',
    doctor_name: 'Both Doctors',
  });

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { isAdmin } = useIsAdmin();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof Medicine>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoadingMedicines, setIsLoadingMedicines] = useState<boolean>(true);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  useEffect(() => {
    fetchMedicines();
  }, [sortField, sortDirection]);

  const fetchMedicines = async () => {
    setIsLoadingMedicines(true);
    try {
      const data = await getAllMedicines();
      setMedicines(data);
    } catch (err) {
      console.error("Failed to fetch medicines:", err);
    } finally {
      setIsLoadingMedicines(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Medicine name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const submissionData = {
        name: formData.name.trim(),
        composition: (formData.composition || '').trim(),
        company: (formData.company || '').trim(),
        description: (formData.description || '').trim(),
        doctor_name: formData.doctor_name || 'Both Doctors',
      };

      if (editMode && editingMedicine?.id) {
        await updateMedicine(editingMedicine.id, submissionData);
        setSuccess(true);
        resetForm();
      } else {
        await addMedicine(submissionData as any);
        setSuccess(true);
        resetForm();
      }
      await fetchMedicines();
    } catch (err) {
      console.error("Error saving medicine:", err);
      setError('Failed to save medicine. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this medicine?")) {
      setIsDeleting(true);
      try {
        await deleteMedicine(id);
        setMedicines(medicines.filter((medicine) => medicine.id !== id));
      } catch (err) {
        console.error("Failed to delete medicine:", err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleEdit = (medicine: Medicine) => {
    setFormData({
      name: medicine.name,
      composition: medicine.composition || '',
      company: medicine.company || '',
      description: medicine.description || '',
      doctor_name: medicine.doctor_name || 'Both Doctors',
    });
    setEditMode(true);
    setEditingMedicine(medicine);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      composition: '',
      company: '',
      description: '',
      doctor_name: 'Both Doctors',
    });
    setError('');
    setEditMode(false);
    setEditingMedicine(null);
  };

  const handleSort = (field: keyof Medicine) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredMedicines = medicines.filter((medicine) => {
    const matchesSearch =
      medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (medicine.composition &&
        medicine.composition.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (medicine.company &&
        medicine.company.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedDoctorFilter === 'ALL') return true;
    const medDoc = medicine.doctor_name || 'Both Doctors';
    if (medDoc === 'Both Doctors' || medDoc === 'All Doctors') return true;
    return medDoc.toLowerCase() === selectedDoctorFilter.toLowerCase();
  });

  const sortedMedicines = [...filteredMedicines].sort((a: Medicine, b: Medicine) => {
    const valueA = (a[sortField] || '').toString().toLowerCase();
    const valueB = (b[sortField] || '').toString().toLowerCase();
    return sortDirection === 'asc'
      ? valueA.localeCompare(valueB)
      : valueB.localeCompare(valueA);
  });

  const renderSortIcon = (field: keyof Medicine) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
  };

  const countVipeen = medicines.filter(m => (m.doctor_name || 'Both Doctors') === 'Dr. Vipeen Raut' || (m.doctor_name || 'Both Doctors') === 'Both Doctors').length;
  const countShillpa = medicines.filter(m => (m.doctor_name || 'Both Doctors') === 'Dr. Shillpa Raut' || (m.doctor_name || 'Both Doctors') === 'Both Doctors').length;

  return (
    <div className="min-h-screen bg-white w-full overflow-auto scrollbar-none">
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <header>
            <h1 className="text-3xl font-bold text-gray-800">Medicine Management</h1>
            <p className="text-gray-600 mt-1">
              Add medicines and compositions tagged per doctor (Dr. Vipeen Raut / Dr. Shillpa Raut) to auto-populate prescriptions
            </p>
          </header>
          <Link
            href="/admin/prescription"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-sm font-semibold transition-all shadow-xs"
          >
            <Pill size={18} />
            <span>Go to Prescriptions →</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Medicine Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 sticky top-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <Pill className="mr-2 text-blue-600" size={22} />
                  {editMode ? 'Edit Medicine' : 'Add New Medicine'}
                </h2>
                {editMode && (
                  <button
                    onClick={resetForm}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                  >
                    <X size={16} className="mr-1" />
                    Cancel
                  </button>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 flex justify-between items-center text-sm">
                  <span>{error}</span>
                  <button onClick={() => setError('')}>
                    <X size={18} />
                  </button>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl mb-6 flex items-center justify-between text-sm">
                  <span>
                    {editMode
                      ? 'Medicine updated successfully!'
                      : 'Medicine added successfully!'}
                  </span>
                  <button onClick={() => setSuccess(false)}>
                    <X size={18} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Doctor Assignment */}
                <div>
                  <label htmlFor="doctor_name" className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <UserCheck size={16} className="text-blue-600" />
                    <span>Assign to Doctor *</span>
                  </label>
                  <select
                    id="doctor_name"
                    name="doctor_name"
                    value={formData.doctor_name || 'Both Doctors'}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm font-medium"
                  >
                    <option value="Both Doctors">Both Doctors (All)</option>
                    <option value="Dr. Vipeen Raut">Dr. Vipeen Raut (Orthopaedic)</option>
                    <option value="Dr. Shillpa Raut">Dr. Shillpa Raut (Gynecology)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Shows in prescription dropdown when this doctor is selected
                  </p>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    placeholder="e.g. ACENAC P TABLET"
                  />
                  <p className="text-xs text-gray-500 mt-1">Name displayed prominently on prescription</p>
                </div>

                <div>
                  <label htmlFor="composition" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Composition *
                  </label>
                  <textarea
                    id="composition"
                    name="composition"
                    value={formData.composition || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    placeholder="e.g. ACECLOFENAC 100 MG + PARACETAMOL 325 MG"
                  />
                  <p className="text-xs text-gray-500 mt-1">Printed under medicine name on prescription</p>
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Company / Manufacturer (Optional)
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    placeholder="e.g. Mankind, Cipla, Sun Pharma"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Notes / Category (Optional)
                  </label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    placeholder="e.g. Tablet, Capsule, Painkiller, Antibiotic"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                        <span>{editMode ? 'Updating...' : 'Adding...'}</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle size={16} className="mr-2" />
                        <span>{editMode ? 'Update Medicine' : 'Save Medicine'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Medicines List Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Medicines Directory</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {sortedMedicines.length} medicine{sortedMedicines.length === 1 ? '' : 's'} registered
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search name, composition..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Doctor Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-5 pb-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase mr-1">Filter Doctor:</span>
                <button
                  type="button"
                  onClick={() => setSelectedDoctorFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedDoctorFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Doctors ({medicines.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDoctorFilter('Dr. Vipeen Raut')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    selectedDoctorFilter === 'Dr. Vipeen Raut'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Dr. Vipeen Raut ({countVipeen})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDoctorFilter('Dr. Shillpa Raut')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    selectedDoctorFilter === 'Dr. Shillpa Raut'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  Dr. Shillpa Raut ({countShillpa})
                </button>
              </div>

              {isLoadingMedicines ? (
                <div className="flex justify-center items-center h-64">
                  <RefreshCw size={32} className="animate-spin text-blue-500" />
                </div>
              ) : sortedMedicines.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
                  <Package size={48} className="mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No medicines found</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    {searchTerm
                      ? "No medicines match your search. Try another keyword."
                      : "Add your first medicine with its composition using the form on the left."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Medicine Name</span>
                              {renderSortIcon('name')}
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            Doctor
                          </th>
                          <th
                            scope="col"
                            className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            Composition
                          </th>
                          <th
                            scope="col"
                            className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
                            onClick={() => handleSort('company')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Company</span>
                              {renderSortIcon('company')}
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-5 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-sm">
                        {sortedMedicines.map((medicine, idx) => {
                          const docName = medicine.doctor_name || 'Both Doctors';
                          return (
                            <tr key={medicine.id || idx} className="hover:bg-blue-50/40 transition">
                              <td className="px-5 py-3.5">
                                <div className="font-semibold text-gray-900">
                                  {medicine.name}
                                </div>
                                {medicine.description && (
                                  <span className="inline-block text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1">
                                    {medicine.description}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                {docName === 'Dr. Vipeen Raut' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                    Dr. Vipeen Raut
                                  </span>
                                ) : docName === 'Dr. Shillpa Raut' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                                    Dr. Shillpa Raut
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full">
                                    Both Doctors
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-gray-700 max-w-xs">
                                {medicine.composition ? (
                                  <span className="font-mono text-xs bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md text-gray-800 block whitespace-pre-wrap">
                                    {medicine.composition}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic text-xs">No composition specified</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-gray-600 text-xs">
                                {medicine.company || '—'}
                              </td>
                              <td className="px-5 py-3.5 text-right font-medium">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEdit(medicine)}
                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                                    title="Edit Medicine"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      onClick={() => medicine.id && handleDelete(medicine.id)}
                                      disabled={isDeleting}
                                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                                      title="Delete Medicine"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}