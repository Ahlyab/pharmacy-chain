// Manager controller for PATCH and DELETE
import mongoose from "mongoose";
import Manager from "../models/Manager.js";
import User from "../models/User.js";
import Branch from "../models/Branch.js";
import { logBranchAction, logUserAction, logFailedAction } from "../utils/auditLogger.js";

export const updateManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, branchId, role, ...rest } = req.body;
    const updateData = { ...rest, role };
    if (branchId) {
      updateData.branch = new mongoose.Types.ObjectId(branchId);
    }

    // Get the current manager for audit logging
    const currentManager = await Manager.findById(id);
    if (!currentManager) return res.status(404).json({ error: "Manager not found" });

    // Update manager document
    const manager = await Manager.findByIdAndUpdate(id, updateData, {
      new: true,
    });

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
        user.branchId = new mongoose.Types.ObjectId(branchId);
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

    // Log the action
    await logUserAction(
      req,
      "USER_UPDATED",
      manager._id,
      manager.name,
      {
        previousRole: currentManager.role,
        newRole: manager.role,
        previousBranch: currentManager.branch,
        newBranch: manager.branch,
        changes: Object.keys(updateData)
      }
    );

    res.status(200).json(populated);
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "USER_UPDATED",
        "Manager",
        req.params.id,
        "Unknown Manager",
        "Failed to update manager",
        error,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

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

    // Log the action
    await logUserAction(
      req,
      "USER_DELETED",
      id,
      manager.name,
      {
        email: manager.email,
        role: manager.role,
        branch: manager.branch
      }
    );

    res.status(200).json({ message: "Manager deleted successfully" });
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "USER_DELETED",
        "Manager",
        req.params.id,
        "Unknown Manager",
        "Failed to delete manager",
        error,
        {}
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(500).json({ error: error.message });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the branch before deletion for audit logging
    const branch = await Branch.findById(id);
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    await Branch.findByIdAndDelete(id);

    // Log the action
    await logBranchAction(
      req,
      "BRANCH_DELETED",
      id,
      branch.name,
      {
        address: branch.address,
        phone: branch.phone,
        status: branch.status
      }
    );

    res.status(200).json({ message: "Branch deleted successfully" });
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "BRANCH_DELETED",
        "Branch",
        req.params.id,
        "Unknown Branch",
        "Failed to delete branch",
        error,
        {}
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(500).json({ error: error.message });
  }
};

export const createBranch = async (req, res) => {
  try {
    const { name, address, phone, status } = req.body;
    if (!name || !address || !phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const branch = new Branch({ name, address, phone, status });
    await branch.save();

    // Log the action
    await logBranchAction(
      req,
      "BRANCH_CREATED",
      branch._id,
      branch.name,
      {
        address: branch.address,
        phone: branch.phone,
        status: branch.status
      }
    );

    res.status(201).json(branch);
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "BRANCH_CREATED",
        "Branch",
        null,
        req.body.name || "Unknown Branch",
        "Failed to create branch",
        error,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

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
    
    // Get the current branch for audit logging
    const currentBranch = await Branch.findById(id);
    if (!currentBranch) return res.status(404).json({ error: "Branch not found" });

    const branch = await Branch.findByIdAndUpdate(id, req.body, { new: true });

    // Log the action
    await logBranchAction(
      req,
      "BRANCH_UPDATED",
      branch._id,
      branch.name,
      {
        previousName: currentBranch.name,
        newName: branch.name,
        previousAddress: currentBranch.address,
        newAddress: branch.address,
        previousPhone: currentBranch.phone,
        newPhone: branch.phone,
        previousStatus: currentBranch.status,
        newStatus: branch.status,
        changes: Object.keys(req.body)
      }
    );

    res.status(200).json(branch);
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "BRANCH_UPDATED",
        "Branch",
        req.params.id,
        "Unknown Branch",
        "Failed to update branch",
        error,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(500).json({ error: error.message });
  }
};
