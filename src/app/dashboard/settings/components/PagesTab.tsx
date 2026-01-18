"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, Loader2, FileText, RefreshCw } from "lucide-react";

type Page = {
	PageId: number;
	PageKey: string;
	PageName: string;
	RoutePath: string;
	SectionKey: string | null;
	SortOrder: number | null;
	IsActive: boolean;
	CreatedAt: Date | null;
};

export default function PagesTab() {
	const [pages, setPages] = useState<Page[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingPage, setEditingPage] = useState<Page | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const [saving, setSaving] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [formData, setFormData] = useState({
		PageKey: "",
		PageName: "",
		RoutePath: "",
		SectionKey: "",
		SortOrder: "",
		IsActive: true,
	});

	useEffect(() => {
		fetchPages();
	}, []);

	const fetchPages = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/settings/pages");
			const data = await response.json();

			if (data.success) {
				setPages(data.pages || []);
			} else {
				setError(data.message || "Failed to fetch pages");
			}
		} catch (err: any) {
			setError(err.message || "Error fetching pages");
		} finally {
			setLoading(false);
		}
	};

	const handleAdd = () => {
		setShowAddForm(true);
		setEditingPage(null);
		setFormData({
			PageKey: "",
			PageName: "",
			RoutePath: "",
			SectionKey: "",
			SortOrder: "",
			IsActive: true,
		});
	};

	const handleEdit = (page: Page) => {
		setEditingPage(page);
		setShowAddForm(false);
		setFormData({
			PageKey: page.PageKey,
			PageName: page.PageName,
			RoutePath: page.RoutePath,
			SectionKey: page.SectionKey || "",
			SortOrder: page.SortOrder?.toString() || "",
			IsActive: page.IsActive,
		});
	};

	const handleCancel = () => {
		setEditingPage(null);
		setShowAddForm(false);
		setFormData({
			PageKey: "",
			PageName: "",
			RoutePath: "",
			SectionKey: "",
			SortOrder: "",
			IsActive: true,
		});
	};

	const handleSave = async () => {
		if (!formData.PageKey.trim() || !formData.PageName.trim() || !formData.RoutePath.trim()) {
			alert("PageKey, PageName, and RoutePath are required");
			return;
		}

		try {
			setSaving(true);
			const url = "/api/settings/pages";
			const method = editingPage ? "PUT" : "POST";
			const body = editingPage
				? {
						...formData,
						PageId: editingPage.PageId,
						SortOrder: formData.SortOrder ? parseInt(formData.SortOrder) : null,
				  }
				: {
						...formData,
						SortOrder: formData.SortOrder ? parseInt(formData.SortOrder) : null,
				  };

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			const data = await response.json();

			if (data.success) {
				await fetchPages();
				handleCancel();
				alert(editingPage ? "Page updated successfully!" : "Page created successfully!");
			} else {
				alert(data.message || "Failed to save page");
			}
		} catch (err: any) {
			alert(err.message || "Error saving page");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (page: Page) => {
		if (!confirm(`Are you sure you want to delete page "${page.PageName}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/settings/pages?pageId=${page.PageId}`, {
				method: "DELETE",
			});

			const data = await response.json();

			if (data.success) {
				await fetchPages();
				alert("Page deleted successfully!");
			} else {
				alert(data.message || "Failed to delete page");
			}
		} catch (err: any) {
			alert(err.message || "Error deleting page");
		}
	};

	const handleSync = async () => {
		const pagesList = prompt(
			"Enter pages as JSON array:\n[{PageKey: 'key', PageName: 'Name', RoutePath: '/path', SectionKey: 'section', SortOrder: 1}]"
		);

		if (!pagesList) return;

		try {
			const parsedPages = JSON.parse(pagesList);
			if (!Array.isArray(parsedPages)) {
				alert("Invalid format. Must be an array.");
				return;
			}

			setSyncing(true);
			const response = await fetch("/api/settings/pages/sync", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pages: parsedPages }),
			});

			const data = await response.json();

			if (data.success) {
				await fetchPages();
				alert(
					`Sync completed! Inserted: ${data.inserted}, Updated: ${data.updated}, Skipped: ${data.skipped}`
				);
			} else {
				alert(data.message || "Failed to sync pages");
			}
		} catch (err: any) {
			alert(err.message || "Error syncing pages");
		} finally {
			setSyncing(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
				<span className="ml-3 text-gray-600">Loading pages...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-gray-900">Pages</h2>
				<div className="flex items-center gap-3">
					<button
						onClick={handleSync}
						disabled={syncing}
						className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
					>
						{syncing ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Syncing...
							</>
						) : (
							<>
								<RefreshCw className="h-4 w-4" />
								Sync Pages
							</>
						)}
					</button>
					<button
						onClick={handleAdd}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-colors"
					>
						<Plus className="h-4 w-4" />
						Add Page
					</button>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Add/Edit Form */}
			{(showAddForm || editingPage) && (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						{editingPage ? "Edit Page" : "Add New Page"}
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Page Key <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.PageKey}
								onChange={(e) => setFormData({ ...formData, PageKey: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								placeholder="e.g., dashboard-baseline"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Page Name <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.PageName}
								onChange={(e) => setFormData({ ...formData, PageName: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								placeholder="e.g., Baseline QOL"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Route Path <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.RoutePath}
								onChange={(e) => setFormData({ ...formData, RoutePath: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								placeholder="e.g., /dashboard/baseline-qol"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Section Key
							</label>
							<input
								type="text"
								value={formData.SectionKey}
								onChange={(e) => setFormData({ ...formData, SectionKey: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								placeholder="e.g., dashboard"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Sort Order
							</label>
							<input
								type="number"
								value={formData.SortOrder}
								onChange={(e) => setFormData({ ...formData, SortOrder: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								placeholder="e.g., 1"
							/>
						</div>
						<div className="flex items-center gap-2 pt-6">
							<input
								type="checkbox"
								id="isActive"
								checked={formData.IsActive}
								onChange={(e) => setFormData({ ...formData, IsActive: e.target.checked })}
								className="w-4 h-4 text-[#0b4d2b] rounded focus:ring-[#0b4d2b]"
							/>
							<label htmlFor="isActive" className="text-sm text-gray-700">
								Active
							</label>
						</div>
					</div>
					<div className="flex items-center gap-3 mt-4">
						<button
							onClick={handleSave}
							disabled={saving}
							className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-colors disabled:opacity-50"
						>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="h-4 w-4" />
									Save
								</>
							)}
						</button>
						<button
							onClick={handleCancel}
							className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
						>
							<X className="h-4 w-4" />
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Pages List */}
			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Page Key
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Page Name
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Route Path
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Section
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{pages.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-4 py-8 text-center text-gray-500">
										<FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
										<p>No pages found</p>
									</td>
								</tr>
							) : (
								pages.map((page) => (
									<tr key={page.PageId} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{page.PageKey}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900">{page.PageName}</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-500">{page.RoutePath}</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-500">
												{page.SectionKey || "—"}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<span
												className={`text-xs px-2 py-1 rounded-full ${
													page.IsActive
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{page.IsActive ? "Active" : "Inactive"}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											<div className="flex items-center gap-2">
												<button
													onClick={() => handleEdit(page)}
													className="text-blue-600 hover:text-blue-800"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleDelete(page)}
													className="text-red-600 hover:text-red-800"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
