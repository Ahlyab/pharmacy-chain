// Manager controller for PATCH and DELETE
import Manager from "../models/Manager.js";
import User from "../models/User.js";

export const updateManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, branchId, role, ...rest } = req.body;
    const updateData = { ...rest, role };
    if (branchId) {
      updateData.branch = branchId;
    }

    // Update manager document
    const manager = await Manager.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!manager) return res.status(404).json({ error: "Manager not found" });

    // Update corresponding user document with password/branch/role if provided
    const user = await User.findOne({
      email: manager.email,
    });
    if (user) {
      let needsSave = false;
      if (password) {
        user.password = password;
        needsSave = true;
      }
      if (branchId) {
        user.branchId = branchId;
        needsSave = true;
      }
      if (role) {
        user.role = role;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    }

    const populated = await Manager.findById(manager._id).populate(
      "branch",
      "name"
    );
    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteManager = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the manager first to get their email
    const manager = await Manager.findById(id);
    if (!manager) return res.status(404).json({ error: "Manager not found" });

    // Delete the manager
    await Manager.findByIdAndDelete(id);

    // Delete the corresponding user (remove role filter to handle both Manager and Sale Assistant)
    await User.findOneAndDelete({ email: manager.email });

    res.status(200).json({ message: "Manager deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByIdAndDelete(id);
    if (!branch) return res.status(404).json({ error: "Branch not found" });
    res.status(200).json({ message: "Branch deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
import Branch from "../models/Branch.js";

export const createBranch = async (req, res) => {
  try {
    const { name, address, phone, status } = req.body;
    if (!name || !address || !phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const branch = new Branch({ name, address, phone, status });
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
    if (!branch) return res.status(404).json({ error: "Branch not found" });
    res.status(200).json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
