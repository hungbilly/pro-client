
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "@/types";
import { Plus, Trash2 } from "lucide-react";
import { getPackages, createPackage, updatePackage, deletePackage } from "@/lib/storage";
import { useCompanyContext } from "@/context/CompanyContext";
import { getCurrencySymbol } from "@/lib/utils";

const PackageSettings: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const currency = selectedCompany?.currency || "USD";
  const currencySymbol = getCurrencySymbol(currency);

  const [packages, setPackages] = useState<Package[]>([]);
  const [newPackage, setNewPackage] = useState({
    name: "",
    description: "",
    price: "",
  });

  useEffect(() => {
    async function fetchPackages() {
      const companyId = selectedCompany?.id;
      if (!companyId) return;
      const data = await getPackages(companyId);
      setPackages(data);
    }
    fetchPackages();
  }, [selectedCompany]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPackage(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddPackage = async () => {
    const companyId = selectedCompany?.id;
    if (!companyId || !newPackage.name || !newPackage.price) return;
    const pkg = await createPackage({
      ...newPackage,
      companyId,
      price: parseFloat(newPackage.price)
    });
    setPackages(prev => [...prev, pkg]);
    setNewPackage({ name: "", description: "", price: "" });
  };

  const handleDeletePackage = async (id: string) => {
    await deletePackage(id);
    setPackages(prev => prev.filter(pkg => pkg.id !== id));
  };

  return (
    <div>
      <h2 className="font-semibold text-xl mb-4">Packages</h2>
      <div className="mb-4 flex gap-2">
        <Input
          name="name"
          value={newPackage.name}
          onChange={handleInputChange}
          placeholder="Package Name"
        />
        <Input
          name="description"
          value={newPackage.description}
          onChange={handleInputChange}
          placeholder="Description"
        />
        <Input
          name="price"
          value={newPackage.price}
          onChange={handleInputChange}
          placeholder="Price"
          type="number"
        />
        <Button onClick={handleAddPackage}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Price</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {packages.map(pkg => (
            <TableRow key={pkg.id}>
              <TableCell>{pkg.name}</TableCell>
              <TableCell>{pkg.description}</TableCell>
              <TableCell>
                {currencySymbol}
                {Number(pkg.price).toFixed(2)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleDeletePackage(pkg.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PackageSettings;
