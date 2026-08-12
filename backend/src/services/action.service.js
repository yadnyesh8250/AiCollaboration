import prisma from "../config/db.js";

/**
 * Tool Registry Action Executor
 * Takes LLM tool names and runs the corresponding database changes.
 */
export const executeTool = async ({ workspaceId, actorId, toolName, args }) => {
  // 1. Verify workspace permission for this tool
  const permission = await prisma.aIPermission.findUnique({
    where: {
      workspaceId_toolName: {
        workspaceId,
        toolName
      }
    }
  });

  // If permission explicitly set to false, block execution
  if (permission && !permission.isAllowed) {
    throw new Error(`Execution of tool '${toolName}' is disabled in this workspace.`);
  }

  console.log(`[ToolRegistry] Executing '${toolName}' with args:`, args);

  switch (toolName) {
    case "createTask": {
      const taskTitle = args.title;
      const desc = args.description || "";
      const assigneeUsername = args.assigneeUsername;

      let assignedTo = null;
      if (assigneeUsername) {
        const user = await prisma.user.findUnique({
          where: { username: assigneeUsername }
        });
        if (user) {
          const isMember = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId: user.id, workspaceId } }
          });
          if (isMember) {
            assignedTo = user.id;
          }
        }
      }

      const maxTask = await prisma.task.findFirst({
        where: { workspaceId, status: "TODO" },
        orderBy: { position: "desc" },
        select: { position: true }
      });
      const position = maxTask ? maxTask.position + 1000.0 : 1000.0;

      const task = await prisma.task.create({
        data: {
          workspaceId,
          title: taskTitle,
          description: desc,
          status: "TODO",
          priority: "MEDIUM",
          type: "TASK",
          createdBy: actorId,
          assignedTo,
          position
        }
      });

      return {
        success: true,
        message: `Task '${taskTitle}' created successfully${assigneeUsername ? ` and assigned to @${assigneeUsername}` : ""}.`,
        task
      };
    }

    case "createChannel": {
      const channelName = args.name;
      const slug = channelName.toLowerCase().replace(/\s+/g, "-");
      const type = args.type || "PUBLIC";
      const description = args.description || "";

      const channel = await prisma.channel.create({
        data: {
          workspaceId,
          name: channelName,
          slug,
          description,
          type,
          createdBy: actorId
        }
      });

      return {
        success: true,
        message: `Channel '#${channelName}' created successfully.`,
        channel
      };
    }

    case "searchMessages": {
      const query = args.query;
      
      // Perform case-insensitive full-text style match over Messages in this workspace
      const messages = await prisma.message.findMany({
        where: {
          channel: { workspaceId },
          content: { contains: query },
          deletedAt: null
        },
        take: 10,
        include: { sender: { select: { username: true } }, channel: { select: { name: true } } }
      });

      const results = messages.map(m => `[#${m.channel.name}] @${m.sender.username}: "${m.content}"`);

      return {
        success: true,
        results: results.length > 0 ? results : ["No matching messages found."]
      };
    }

    case "searchUIUXDesign": {
      const query = args.query;
      const domain = args.domain;
      
      const { execSync } = await import("child_process");
      const path = await import("path");
      
      const scriptPath = path.join(process.cwd(), "..", "frontend", ".agent", "skills", "ui-ux-pro-max", "scripts", "search.py");
      
      let command = `python3 "${scriptPath}" "${query.replace(/"/g, '\\"')}"`;
      if (domain) {
        command += ` --domain ${domain}`;
      }
      
      console.log(`[ToolRegistry] Running searchUIUXDesign command: ${command}`);
      
      try {
        const output = execSync(command, { encoding: "utf-8" });
        return {
          success: true,
          results: [output]
        };
      } catch (execErr) {
        console.error("Failed to run UI search script:", execErr);
        return {
          success: false,
          results: [`Failed to query UI/UX Pro Max engine: ${execErr.message}`]
        };
      }
    }

    default:
      throw new Error(`Tool '${toolName}' is not registered in the tool executor.`);
  }
};
