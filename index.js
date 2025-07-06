
const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const app = express();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

// Verify command definition
const verifyCommand = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify a user by assigning and removing roles, sending a message, and closing a channel.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to verify')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('give_role')
        .setDescription('Role to give to the user')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('remove_role')
        .setDescription('Role to remove from the user')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to send the message and close')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const roleToGive = interaction.options.getRole('give_role');
    const roleToRemove = interaction.options.getRole('remove_role');
    const channel = interaction.options.getChannel('channel');

    // Ensure the bot can manage roles
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: '❌ I do not have permission to manage roles.', ephemeral: true });
    }

    // Perform role changes
    try {
      await member.roles.add(roleToGive);
      await member.roles.remove(roleToRemove);
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: '⚠️ There was an error modifying the roles.', ephemeral: true });
    }

    // Send pre-determined message
    const messageContent = `✅ <@${member.id}> has been verified and will be moved shortly. This channel will close in 5 minutes.`;
    await channel.send(messageContent);

    // Respond to the interaction
    await interaction.reply({ content: `Verified <@${member.id}>. Roles updated and message sent to <#${channel.id}>.`, ephemeral: true });

    // Close the channel in 5 minutes (delete or lock)
    setTimeout(async () => {
      if (!channel) return;

      try {
        await channel.permissionOverwrites.edit(member.id, {
          ViewChannel: false
        });

        await channel.send('🔒 This channel is now closed.');
      } catch (error) {
        console.error('Error closing channel:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
};

// Bot ready event
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'verify') {
    await verifyCommand.execute(interaction);
  }
});

// Express server for health check
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Server is ready.'));

// Login with token
const token = process.env.TOKEN;
client.login(token);
