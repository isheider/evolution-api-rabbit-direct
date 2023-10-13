import * as amqp from 'amqplib/callback_api';

import { configService, HttpServer, Rabbitmq } from '../config/env.config';
import { Logger } from '../config/logger.config';

const logger = new Logger('AMQP');

let amqpChannel: amqp.Channel | null = null;

export const initAMQP = () => {
  return new Promise<void>((resolve, reject) => {
    const uri = configService.get<Rabbitmq>('RABBITMQ').URI;
    amqp.connect(uri, (error, connection) => {
      if (error) {
        reject(error);
        return;
      }

      connection.createChannel((channelError, channel) => {
        if (channelError) {
          reject(channelError);
          return;
        }

        const exchangeName = 'evolution_exchange';

        channel.assertExchange(exchangeName, 'direct', {
          durable: true,
          autoDelete: false,
        });

        amqpChannel = channel;

        logger.info('AMQP initialized');
        const serverUrl = configService.get<HttpServer>('SERVER').URL;

        let queueName = serverUrl.includes('https')
          ? serverUrl.split('https://')[1].split('.')[0]
          : serverUrl.replace(':', '_');

        const bindName = queueName;

        queueName = `recieve_${queueName}`;

        amqpChannel.assertQueue(queueName, {
          durable: true,
          autoDelete: false,
          arguments: {
            'x-queue-type': 'quorum',
          },
        });

        amqpChannel.bindQueue(queueName, exchangeName, bindName);
        logger.info(`queue name: ${queueName}`);
        resolve();
      });
    });
  });
};

export const getAMQP = (): amqp.Channel | null => {
  return amqpChannel;
};

export const initQueues = (instanceName: string, events: string[]) => {
  if (!events || !events.length) return;

  const queues = events.map((event) => {
    return `${event.replace(/_/g, '.').toLowerCase()}`;
  });

  queues.forEach(() => {
    const amqp = getAMQP();
    const exchangeName = 'evolution_exchange';

    amqp.assertExchange(exchangeName, 'direct', {
      durable: true,
      autoDelete: false,
    });

    const serverUrl = configService.get<HttpServer>('SERVER').URL;

    let queueName = serverUrl.includes('https')
      ? serverUrl.split('https://')[1].split('.')[0]
      : serverUrl.replace(':', '_');

    const bindName = queueName;

    queueName = `recieve_${queueName}`;

    logger.info(`queue name: ${queueName}`);

    amqp.assertQueue(queueName, {
      durable: true,
      autoDelete: false,
      arguments: {
        'x-queue-type': 'quorum',
      },
    });

    amqp.bindQueue(queueName, exchangeName, bindName);
  });
};

export const removeQueues = (instanceName: string, events: string[]) => {
  if (!events || !events.length) return;

  const channel = getAMQP();

  const exchangeName = 'evolution_exchange';

  // queues.forEach((event) => {

  // });

  const amqp = getAMQP();

  amqp.assertExchange(exchangeName, 'direct', {
    durable: true,
    autoDelete: false,
  });

  const serverUrl = configService.get<HttpServer>('SERVER').URL;

  let queueName = serverUrl.includes('https')
    ? serverUrl.split('https://')[1].split('.')[0]
    : serverUrl.replace(':', '_');

  queueName = `recieve_${queueName}`;

  amqp.deleteQueue(queueName);

  channel.deleteExchange(exchangeName);
};
