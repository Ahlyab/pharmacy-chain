// Manager controller for PATCH and DELETE
import Manager from '../models/Manager.js';

export const updateManager = async (req, res) => {
  try {
    const { id } = req.params;
    const manager = await Manager.findByIdAndUpdate(id, req.body, { new: true });
    if (!manager) return res.status(404).json({ error: 'Manager not found' });
    res.status(200).json(manager);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteManager = async (req, res) => {
  try {
    const { id } = req.params;
    const manager = await Manager.findByIdAndDelete(id);
    if (!manager) return res.status(404).json({ error: 'Manager not found' });
    res.status(200).json({ message: 'Manager deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByIdAndDelete(id);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.status(200).json({ message: 'Branch deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
import Branch from '../models/Branch.js';

export const createBranch = async (req, res) => {
  try {
    const { name, address, phone, manager, status } = req.body;
    if (!name || !address || !phone || !manager) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const branch = new Branch({ name, address, phone, manager, status });
    await branch.save();
    res.status(201).json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find();
    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByIdAndUpdate(id, req.body, { new: true });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.status(200).json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
