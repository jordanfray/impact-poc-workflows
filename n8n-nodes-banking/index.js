const { BankingTransfer } = require('./dist/nodes/BankingTransfer/BankingTransfer.node.js');
const { BankingAccount } = require('./dist/nodes/BankingAccount/BankingAccount.node.js');
const { BankingNotification } = require('./dist/nodes/BankingNotification/BankingNotification.node.js');
const { BankingTrigger } = require('./dist/nodes/BankingTrigger/BankingTrigger.node.js');

module.exports = {
  BankingTransfer,
  BankingAccount,
  BankingNotification,
  BankingTrigger,
};
