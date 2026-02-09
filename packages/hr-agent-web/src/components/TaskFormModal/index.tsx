import { Modal, Form, Input, Select, InputNumber, Button } from 'antd';
import type { Task, CreateTaskDto, UpdateTaskDto } from '../../types/task';
import { TASK_STATUS_LABELS } from '../../types/task';

interface TaskFormModalProps {
  open: boolean;
  task: Task | null;
  mode: 'create' | 'edit';
  onCancel: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (_data: CreateTaskDto | UpdateTaskDto) => void;
  loading?: boolean;
}

export function TaskFormModal({
  open,
  task,
  mode,
  onCancel,
  onSubmit,
  loading
}: TaskFormModalProps) {
  const [form] = Form.useForm();

  const isEdit = mode === 'edit';

  const handleSubmit = () => {
    form.validateFields().then((_values) => {
      onSubmit(_values as CreateTaskDto | UpdateTaskDto);
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={isEdit ? '编辑任务' : '添加任务'}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
          {isEdit ? '保存' : '创建'}
        </Button>
      ]}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: task?.type || '',
          status: task?.status || 'queued',
          priority: task?.priority ?? 50
        }}
      >
        <Form.Item
          label="任务类型"
          name="type"
          rules={[{ required: true, message: '请输入任务类型' }]}
        >
          <Input placeholder="例如: aiCodingTask" />
        </Form.Item>

        {!isEdit && (
          <Form.Item
            label="任务状态"
            name="status"
            rules={[{ required: true, message: '请选择任务状态' }]}
          >
            <Select placeholder="选择任务状态">
              {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                <Select.Option key={key} value={key}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          label="优先级"
          name="priority"
          rules={[{ required: true, message: '请选择优先级' }]}
        >
          <Select placeholder="选择优先级">
            <Select.Option value={0}>低</Select.Option>
            <Select.Option value={50}>中</Select.Option>
            <Select.Option value={100}>高</Select.Option>
          </Select>
        </Form.Item>

        {!isEdit && (
          <>
            <Form.Item label="Issue ID" name="issueId">
              <InputNumber min={0} placeholder="输入 Issue ID" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="PR ID" name="prId">
              <InputNumber min={0} placeholder="输入 PR ID" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="CA ID" name="caId">
              <InputNumber min={0} placeholder="输入 CA ID" style={{ width: '100%' }} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
